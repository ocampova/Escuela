"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { audienceFilter, guardianStudents } from "@/lib/queries";

async function visibleAnnouncement(id: string) {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const ann = await prisma.announcement.findFirst({ where: { id, schoolId: user.schoolId, ...audienceFilter(students) } });
  if (!ann) throw new Error("Aviso no encontrado");
  return { user, ann };
}

export async function acknowledge(id: string) {
  const { user } = await visibleAnnouncement(id);
  const now = new Date();
  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: id, userId: user.id } },
    create: { announcementId: id, userId: user.id, readAt: now, acknowledgedAt: now },
    update: { acknowledgedAt: now },
  });
  revalidatePath("/familia", "layout");
}

export async function markRead(id: string) {
  const { user } = await visibleAnnouncement(id);
  await prisma.announcementRead.upsert({
    where: { announcementId_userId: { announcementId: id, userId: user.id } },
    create: { announcementId: id, userId: user.id },
    update: {},
  });
}
