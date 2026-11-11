"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { audienceFilter, guardianStudents } from "@/lib/queries";
import { keyToDate, todayKey } from "@/lib/format";

/** Respuesta Sí / No a una autorización, por estudiante. Responder también cuenta como «Enterado». */
export async function answerPermission(announcementId: string, studentId: string, answer: "YES" | "NO") {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const student = students.find((s) => s.id === studentId);
  if (!student) throw new Error("Estudiante no encontrado.");
  const a = await prisma.announcement.findFirst({ where: { id: announcementId, schoolId: user.schoolId, permissionQuestion: { not: null }, ...audienceFilter([student]) } });
  if (!a) throw new Error("Autorización no encontrada.");
  if (a.permissionDeadline && a.permissionDeadline < keyToDate(todayKey())) throw new Error("El plazo para responder ya venció. Escriba a la escuela.");
  const now = new Date();
  await prisma.$transaction([
    prisma.permissionResponse.upsert({
      where: { announcementId_studentId: { announcementId, studentId } },
      create: { announcementId, studentId, guardianId: user.id, answer, respondedAt: now },
      update: { guardianId: user.id, answer, respondedAt: now },
    }),
    prisma.announcementRead.upsert({
      where: { announcementId_userId: { announcementId, userId: user.id } },
      create: { announcementId, userId: user.id, readAt: now, acknowledgedAt: now },
      update: { acknowledgedAt: now },
    }),
  ]);
  revalidatePath("/familia", "layout");
  revalidatePath("/escuela", "layout");
}
