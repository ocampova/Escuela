"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { notifyLater } from "@/lib/push";
import { keyToDate, todayKey } from "@/lib/format";

export type AbsenceState = { error?: string };

const REASONS = ["Enfermedad", "Cita médica", "Asunto familiar", "Llegará tarde", "Otro"] as const;

const schema = z.object({
  studentId: z.string().min(1),
  dateFrom: z.string().date("Elija desde qué día."),
  dateTo: z.string().date("Elija hasta qué día."),
  reason: z.enum(REASONS, { message: "Elija el motivo." }),
  note: z.string().trim().max(300).optional(),
});

export async function reportAbsence(_p: AbsenceState, f: FormData): Promise<AbsenceState> {
  const user = await requireGuardian();
  const p = schema.safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;
  if (d.dateTo < d.dateFrom) return { error: "La fecha final no puede ser antes de la inicial." };
  const today = todayKey();
  if (d.dateTo < today && d.dateFrom < today && d.reason !== "Llegará tarde") {
    // Se permite justificar días pasados recientes (hasta 7 días)
    const min = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
    if (d.dateFrom < min) return { error: "Solo puede justificar ausencias de los últimos 7 días. Para fechas anteriores, escriba a la oficina." };
  }
  const student = await prisma.student.findFirst({
    where: { id: d.studentId, guardians: { some: { userId: user.id } } },
    include: { section: { select: { teacherId: true } } },
  });
  if (!student) return { error: "Estudiante no encontrado." };

  const from = keyToDate(d.dateFrom);
  const to = keyToDate(d.dateTo);
  await prisma.absenceNotice.create({ data: { studentId: student.id, guardianId: user.id, dateFrom: from, dateTo: to, reason: d.reason, note: d.note || null } });

  // Días ya registrados como ausencia (hasta hoy) quedan justificados
  if (d.reason !== "Llegará tarde") {
    await prisma.attendance.updateMany({
      where: { studentId: student.id, date: { gte: from, lte: to }, status: "ABSENT" },
      data: { status: "EXCUSED", note: `${d.reason}${d.note ? `: ${d.note}` : ""} (avisado por la familia)` },
    });
  }

  if (student.section.teacherId) {
    const when = d.dateFrom === d.dateTo ? (d.dateFrom === today ? "hoy" : `el ${d.dateFrom.split("-").reverse().slice(0, 2).join("/")}`) : `del ${d.dateFrom.split("-").reverse().slice(0, 2).join("/")} al ${d.dateTo.split("-").reverse().slice(0, 2).join("/")}`;
    notifyLater([student.section.teacherId], {
      title: d.reason === "Llegará tarde" ? `${student.firstName} llegará tarde ${when}` : `${student.firstName} no asistirá ${when}`,
      body: `${d.reason}${d.note ? `: ${d.note}` : ""}`,
      url: `/escuela/asistencia?fecha=${d.dateFrom >= today ? d.dateFrom : today}`,
    });
  }
  revalidatePath("/familia", "layout");
  revalidatePath("/escuela", "layout");
  redirect(`/familia/hijos/${student.id}?ausencia=1`);
}
