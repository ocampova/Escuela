"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import type { ActionState } from "@/components/action-form";

async function manager() {
  const u = await requireStaff();
  if (!isManager(u)) throw new Error("Solo Dirección y Secretaría editan expedientes.");
  return u;
}

async function ownStudent(id: string, schoolId: string) {
  const s = await prisma.student.findFirst({ where: { id, section: { schoolYear: { schoolId } } } });
  if (!s) throw new Error("Alumno no encontrado.");
  return s;
}

const opt = z
  .string()
  .trim()
  .max(300)
  .optional()
  .transform((v) => v || null);

const studentSchema = z.object({
  firstName: z.string().trim().min(2, "Escriba el nombre."),
  lastName: z.string().trim().min(3, "Escriba los apellidos."),
  idNumber: opt,
  birthDate: z.string().date("Fecha de nacimiento no válida."),
  sectionId: z.string().min(1, "Elija la sección."),
  bloodType: opt,
  allergies: opt,
  medicalNotes: opt,
});

export async function saveStudent(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const id = String(f.get("id") ?? "");
  const p = studentSchema.safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const section = await prisma.section.findFirst({ where: { id: p.data.sectionId, schoolYear: { schoolId: u.schoolId } } });
  if (!section) return { error: "Sección no encontrada." };
  const data = { ...p.data, birthDate: new Date(p.data.birthDate) };
  let studentId = id;
  if (id) {
    await ownStudent(id, u.schoolId);
    await prisma.student.update({ where: { id }, data });
  } else {
    studentId = (await prisma.student.create({ data })).id;
  }
  revalidatePath("/escuela", "layout");
  redirect(`/escuela/alumnos/${studentId}${id ? "" : "?nuevo=1"}`);
}

/* ---------- Encargados ---------- */

const guardianSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().trim().min(5, "Escriba nombre y apellidos del encargado."),
  email: z.string().trim().toLowerCase().email("Correo no válido."),
  phone: opt,
  relationship: z.string().trim().min(3, "Indique el parentesco."),
  isPrimary: z.boolean(),
});

/** Agrega un encargado. Si ya existe una cuenta de familia con ese correo, la vincula (hermanos). */
export async function addGuardian(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const p = guardianSchema.safeParse({ ...Object.fromEntries(f), isPrimary: f.get("isPrimary") === "on" });
  if (!p.success) return { error: p.error.issues[0].message };
  await ownStudent(p.data.studentId, u.schoolId);
  const result = await linkGuardian(u.schoolId, p.data);
  if ("error" in result) return result;
  revalidatePath(`/escuela/alumnos/${p.data.studentId}`);
  return { ok: result.created ? `${p.data.name} agregado. Ahora envíele la invitación.` : `${p.data.name} ya tenía cuenta (por un hermano) y quedó vinculado.` };
}

async function linkGuardian(
  schoolId: string,
  g: { studentId: string; name: string; email: string; phone: string | null; relationship: string; isPrimary: boolean },
  tx: Prisma.TransactionClient = prisma,
): Promise<{ created: boolean } | { error: string }> {
  let user = await tx.user.findUnique({ where: { email: g.email } });
  if (user && (user.role !== "GUARDIAN" || user.schoolId !== schoolId)) return { error: "Ese correo pertenece a una cuenta del personal." };
  const created = !user;
  if (!user) user = await tx.user.create({ data: { schoolId, role: "GUARDIAN", name: g.name, email: g.email, phone: g.phone } });
  if (g.isPrimary) await tx.studentGuardian.updateMany({ where: { studentId: g.studentId }, data: { isPrimary: false } });
  await tx.studentGuardian.upsert({
    where: { studentId_userId: { studentId: g.studentId, userId: user.id } },
    create: { studentId: g.studentId, userId: user.id, relationship: g.relationship, isPrimary: g.isPrimary },
    update: { relationship: g.relationship, isPrimary: g.isPrimary },
  });
  return { created };
}

export async function removeGuardian(studentId: string, userId: string) {
  const u = await manager();
  await ownStudent(studentId, u.schoolId);
  await prisma.studentGuardian.delete({ where: { studentId_userId: { studentId, userId } } });
  revalidatePath(`/escuela/alumnos/${studentId}`);
}

/* ---------- Autorizados para recoger ---------- */

export async function addPickup(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const p = z
    .object({
      studentId: z.string().min(1),
      name: z.string().trim().min(5, "Escriba nombre y apellidos."),
      idNumber: z.string().trim().min(5, "Escriba la cédula."),
      relationship: z.string().trim().min(3, "Indique el parentesco."),
      phone: opt,
    })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  await ownStudent(p.data.studentId, u.schoolId);
  await prisma.authorizedPickup.create({ data: p.data });
  revalidatePath(`/escuela/alumnos/${p.data.studentId}`);
  revalidatePath("/familia", "layout");
  return { ok: `${p.data.name} quedó autorizada para recoger.` };
}

export async function removePickup(id: string) {
  const u = await manager();
  const p = await prisma.authorizedPickup.findFirst({ where: { id, student: { section: { schoolYear: { schoolId: u.schoolId } } } } });
  if (!p) return;
  await prisma.authorizedPickup.delete({ where: { id } });
  revalidatePath(`/escuela/alumnos/${p.studentId}`);
  revalidatePath("/familia", "layout");
}

/* ---------- Importación ---------- */

export type ImportRow = {
  firstName: string;
  lastName: string;
  idNumber: string | null;
  birthDate: string;
  sectionId: string;
  allergies: string | null;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string | null;
  relationship: string;
};

export async function importStudents(rows: ImportRow[]): Promise<{ created: number; linked: number; error?: string }> {
  const u = await manager();
  if (rows.length === 0) return { created: 0, linked: 0, error: "No hay filas para importar." };
  if (rows.length > 500) return { created: 0, linked: 0, error: "Importe como máximo 500 alumnos por archivo." };
  const sections = new Set((await prisma.section.findMany({ where: { schoolYear: { schoolId: u.schoolId, active: true } }, select: { id: true } })).map((s) => s.id));
  let created = 0;
  let linked = 0;
  try {
    await prisma.$transaction(
      async (tx) => {
        for (const r of rows) {
          if (!sections.has(r.sectionId)) throw new Error(`Sección no válida para ${r.firstName} ${r.lastName}.`);
          const st = await tx.student.create({
            data: { firstName: r.firstName, lastName: r.lastName, idNumber: r.idNumber, birthDate: new Date(r.birthDate), sectionId: r.sectionId, allergies: r.allergies },
          });
          const res = await linkGuardian(
            u.schoolId,
            { studentId: st.id, name: r.guardianName, email: r.guardianEmail, phone: r.guardianPhone, relationship: r.relationship, isPrimary: true },
            tx,
          );
          if ("error" in res) throw new Error(`${r.guardianEmail}: ${res.error}`);
          created++;
          if (!res.created) linked++;
        }
      },
      { timeout: 60_000 },
    );
  } catch (e) {
    return { created: 0, linked: 0, error: e instanceof Error ? e.message : "No se pudo importar." };
  }
  revalidatePath("/escuela", "layout");
  return { created, linked };
}
