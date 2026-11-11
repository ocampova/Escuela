"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import type { ActionState } from "@/components/action-form";
import { FORMAL_STEPS } from "@/lib/enrollment";

const STATUSES = ["NEW", "CONTACTED", "VISIT", "ACCEPTED", "REJECTED"] as const;

async function own(id: string) {
  const u = await requireStaff();
  if (!isManager(u)) throw new Error("Solo Dirección y Secretaría gestionan la matrícula.");
  const a = await prisma.applicant.findFirst({ where: { id, schoolId: u.schoolId } });
  if (!a) throw new Error("Solicitud no encontrada.");
  return { u, a };
}

export async function updateApplicant(_p: ActionState, f: FormData): Promise<ActionState> {
  const { a } = await own(String(f.get("id")));
  if (a.status === "ENROLLED") return { error: "Esta solicitud ya está matriculada." };
  const status = String(f.get("status"));
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return { error: "Estado no válido." };
  const checklist = f.getAll("checklist").map(String).filter((k) => FORMAL_STEPS.some((s) => s.key === k));
  await prisma.applicant.update({
    where: { id: a.id },
    data: { status: status as (typeof STATUSES)[number], staffNotes: String(f.get("staffNotes") ?? "").trim() || null, checklist },
  });
  revalidatePath("/escuela/matricula", "layout");
  return { ok: "Cambios guardados." };
}

/** Crea el alumno y la cuenta del encargado a partir de la solicitud. */
export async function enrollApplicant(_p: ActionState, f: FormData): Promise<ActionState> {
  const { u, a } = await own(String(f.get("id")));
  if (a.status === "ENROLLED") return { error: "Ya está matriculada." };
  const section = await prisma.section.findFirst({ where: { id: String(f.get("sectionId")), schoolYear: { schoolId: u.schoolId, active: true } } });
  if (!section) return { error: "Elija una sección." };
  const existing = await prisma.user.findUnique({ where: { email: a.guardianEmail } });
  if (existing && (existing.role !== "GUARDIAN" || existing.schoolId !== u.schoolId)) return { error: "El correo del encargado pertenece a una cuenta del personal." };

  const studentId = await prisma.$transaction(async (tx) => {
    const guardian = existing ?? (await tx.user.create({ data: { schoolId: u.schoolId, role: "GUARDIAN", name: a.guardianName, email: a.guardianEmail, phone: a.guardianPhone } }));
    const st = await tx.student.create({
      data: {
        sectionId: section.id,
        firstName: a.childFirstName,
        lastName: a.childLastName,
        idNumber: a.childIdNumber,
        birthDate: a.childBirthDate,
        allergies: a.allergies,
        guardians: { create: { userId: guardian.id, relationship: a.relationship, isPrimary: true } },
        pickups: a.guardianIdNumber ? { create: { name: a.guardianName, idNumber: a.guardianIdNumber, relationship: a.relationship, phone: a.guardianPhone } } : undefined,
      },
    });
    // Cobro de matrícula según el precio vigente (con descuento en los meses indicados)
    const concept = await tx.feeConcept.findFirst({ where: { schoolId: u.schoolId, name: { equals: "Matrícula", mode: "insensitive" } } });
    if (concept) {
      const month = new Date().getMonth() + 1;
      const early = concept.earlyAmount && concept.earlyMonths.includes(month);
      const due = new Date();
      due.setUTCDate(due.getUTCDate() + 15);
      await tx.charge.create({
        data: {
          studentId: st.id,
          conceptId: concept.id,
          description: `Matrícula ${a.forYear}${early ? " (con descuento)" : ""}`,
          period: a.forYear,
          amount: early ? concept.earlyAmount! : concept.defaultAmount,
          currency: concept.currency,
          dueDate: new Date(due.toISOString().slice(0, 10)),
        },
      });
    }
    await tx.applicant.update({ where: { id: a.id }, data: { status: "ENROLLED", studentId: st.id } });
    return st.id;
  });
  revalidatePath("/escuela", "layout");
  redirect(`/escuela/alumnos/${studentId}?nuevo=1`);
}
