"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import type { ActionState } from "@/components/action-form";

async function manager() {
  const u = await requireStaff();
  if (!isManager(u)) throw new Error("Solo Dirección y Secretaría pueden cambiar la configuración.");
  return u;
}

const done = (ok: string): ActionState => {
  revalidatePath("/escuela", "layout");
  return { ok };
};

const COLORS = ["orange", "green", "blue"] as const;

export async function saveSchoolYear(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const p = z
    .object({ name: z.string().trim().min(3, "Escriba el nombre del curso lectivo."), startsOn: z.string().date("Fecha de inicio no válida."), endsOn: z.string().date("Fecha de cierre no válida.") })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.endsOn <= p.data.startsOn) return { error: "La fecha de cierre debe ser posterior al inicio." };
  const year = await prisma.schoolYear.findFirst({ where: { schoolId: u.schoolId, active: true } });
  const data = { name: p.data.name, startsOn: new Date(p.data.startsOn), endsOn: new Date(p.data.endsOn) };
  if (year) await prisma.schoolYear.update({ where: { id: year.id }, data });
  else await prisma.schoolYear.create({ data: { ...data, schoolId: u.schoolId, active: true } });
  return done("Curso lectivo guardado.");
}

export async function addLevel(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const name = String(f.get("name") ?? "").trim();
  if (name.length < 3) return { error: "Escriba el nombre del nivel." };
  const count = await prisma.level.count({ where: { schoolId: u.schoolId } });
  await prisma.level.create({ data: { schoolId: u.schoolId, name, order: count + 1 } });
  return done(`Nivel «${name}» agregado.`);
}

export async function addGrade(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const name = String(f.get("name") ?? "").trim();
  const levelId = String(f.get("levelId") ?? "");
  if (name.length < 2) return { error: "Escriba el nombre del grado." };
  const level = await prisma.level.findFirst({ where: { id: levelId, schoolId: u.schoolId }, include: { _count: { select: { grades: true } } } });
  if (!level) return { error: "Elija un nivel." };
  await prisma.grade.create({ data: { levelId, name, order: level._count.grades + 1 } });
  return done(`Grado «${name}» agregado a ${level.name}.`);
}

export async function addSection(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const p = z
    .object({ gradeId: z.string().min(1, "Elija el grado."), name: z.string().trim().min(1, "Escriba la letra o nombre de la sección.").max(20), color: z.enum(COLORS), teacherId: z.string().optional() })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const [grade, year] = await Promise.all([
    prisma.grade.findFirst({ where: { id: p.data.gradeId, level: { schoolId: u.schoolId } } }),
    prisma.schoolYear.findFirst({ where: { schoolId: u.schoolId, active: true } }),
  ]);
  if (!grade) return { error: "Grado no encontrado." };
  if (!year) return { error: "Primero configure el curso lectivo." };
  const exists = await prisma.section.findFirst({ where: { gradeId: grade.id, schoolYearId: year.id, name: p.data.name } });
  if (exists) return { error: `Ya existe ${grade.name} ${p.data.name}.` };
  await prisma.section.create({
    data: { gradeId: grade.id, schoolYearId: year.id, name: p.data.name, color: p.data.color, teacherId: p.data.teacherId || null },
  });
  return done(`Sección ${grade.name} ${p.data.name} creada.`);
}

export async function updateSection(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const id = String(f.get("id") ?? "");
  const color = String(f.get("color") ?? "");
  const teacherId = String(f.get("teacherId") ?? "") || null;
  if (!COLORS.includes(color as (typeof COLORS)[number])) return { error: "Color no válido." };
  const section = await prisma.section.findFirst({ where: { id, schoolYear: { schoolId: u.schoolId } } });
  if (!section) return { error: "Sección no encontrada." };
  if (teacherId && !(await prisma.user.findFirst({ where: { id: teacherId, schoolId: u.schoolId, role: "TEACHER" } }))) return { error: "Docente no encontrada." };
  await prisma.section.update({ where: { id }, data: { color, teacherId } });
  return done("Cambios guardados.");
}

const ROLES = { TEACHER: "Docente", STAFF: "Secretaría", ADMIN: "Dirección" } as const;

export async function addStaff(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const p = z
    .object({
      name: z.string().trim().min(5, "Escriba nombre y apellidos."),
      email: z.string().trim().toLowerCase().email("Correo no válido."),
      phone: z.string().trim().max(20).optional(),
      role: z.enum(["TEACHER", "STAFF", "ADMIN"]),
    })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.role === "ADMIN" && u.role !== "ADMIN") return { error: "Solo Dirección puede crear otra cuenta de Dirección." };
  if (await prisma.user.findUnique({ where: { email: p.data.email } })) return { error: "Ya existe una cuenta con ese correo." };
  await prisma.user.create({ data: { schoolId: u.schoolId, name: p.data.name, email: p.data.email, phone: p.data.phone || null, role: p.data.role } });
  return done(`${ROLES[p.data.role]} agregada: ${p.data.name}. Ahora envíele la invitación.`);
}

export async function setUserActive(userId: string, active: boolean) {
  const u = await manager();
  if (userId === u.id) throw new Error("No puede desactivar su propia cuenta.");
  await prisma.user.updateMany({ where: { id: userId, schoolId: u.schoolId, role: { not: "ADMIN" } }, data: { active } });
  revalidatePath("/escuela/configuracion");
}

/* ---------- Pagos ---------- */

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => v || null);

export async function saveBank(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  if (u.role !== "ADMIN") return { error: "Solo Dirección cambia la cuenta bancaria." };
  const p = z
    .object({
      bankName: optText(80),
      bankAccountHolder: optText(120),
      bankHolderId: optText(30),
      bankIban: z
        .string()
        .trim()
        .toUpperCase()
        .optional()
        .transform((v) => v || null)
        .refine((v) => !v || /^CR\d{2}( ?\d{4}){4} ?\d{2}$/.test(v), "El IBAN de Costa Rica tiene el formato CR00 0000 0000 0000 0000 00."),
      sinpePhone: optText(20),
      paymentNote: optText(300),
    })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  await prisma.school.update({ where: { id: u.schoolId }, data: p.data });
  return done("Cuenta para pagos guardada. Las familias la ven al reportar un pago.");
}

const conceptSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(3, "Escriba el nombre del concepto."),
  defaultAmount: z.coerce.number().int().positive("Escriba el monto."),
  currency: z.enum(["CRC", "USD"]),
  levelId: z.string().optional(),
  recurring: z.boolean(),
  earlyAmount: z.coerce.number().int().positive().optional(),
  dueNote: optText(120),
});

export async function saveConcept(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const raw = Object.fromEntries(f) as Record<string, string>;
  const p = conceptSchema.safeParse({
    ...raw,
    defaultAmount: (raw.defaultAmount ?? "").replace(/[^\d]/g, ""),
    earlyAmount: (raw.earlyAmount ?? "").replace(/[^\d]/g, "") || undefined,
    recurring: raw.recurring === "on",
  });
  if (!p.success) return { error: p.error.issues[0].message };
  const { id, levelId, earlyAmount, ...d } = p.data;
  if (levelId && !(await prisma.level.findFirst({ where: { id: levelId, schoolId: u.schoolId } }))) return { error: "Nivel no válido." };
  const data = { ...d, levelId: levelId || null, earlyAmount: earlyAmount ?? null, earlyMonths: earlyAmount ? [8, 9] : [] };
  if (id) {
    const c = await prisma.feeConcept.findFirst({ where: { id, schoolId: u.schoolId } });
    if (!c) return { error: "Concepto no encontrado." };
    await prisma.feeConcept.update({ where: { id }, data });
    return done(`«${d.name}» actualizado. Los cobros nuevos usarán este monto.`);
  }
  await prisma.feeConcept.create({ data: { ...data, schoolId: u.schoolId } });
  return done(`Concepto «${d.name}» creado.`);
}

export async function saveLevelInfo(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const p = z
    .object({ id: z.string(), schedule: optText(300), phone: optText(60), address: optText(300), materials: optText(5000) })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const { id, ...data } = p.data;
  const r = await prisma.level.updateMany({ where: { id, schoolId: u.schoolId }, data });
  if (r.count === 0) return { error: "Nivel no encontrado." };
  revalidatePath("/familia", "layout");
  return done("Información del nivel guardada.");
}
