"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canWrite, staffRecipients } from "@/lib/messages";
import { notifyLater } from "@/lib/push";

export type SendState = { error?: string; sentAt?: number };

const schema = z.object({
  conversationId: z.string().optional(),
  studentId: z.string().optional(),
  guardianId: z.string().optional(),
  channel: z.enum(["TEACHER", "OFFICE"]).optional(),
  body: z.string().trim().min(1, "Escriba un mensaje.").max(2000, "El mensaje es muy largo (máximo 2000 caracteres)."),
});

/** Envía un mensaje. Crea el hilo la primera vez (familia ↔ docente u oficina, por alumno). */
export async function sendMessage(_p: SendState, f: FormData): Promise<SendState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Su sesión expiró. Entre de nuevo." };
  if (!user.school.messagingEnabled) return { error: "La escuela desactivó los mensajes en la plataforma." };
  const p = schema.safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  const d = p.data;

  let conv = d.conversationId
    ? await prisma.conversation.findFirst({ where: { id: d.conversationId, schoolId: user.schoolId }, include: { student: { include: { section: true } } } })
    : null;

  if (!conv) {
    if (!d.studentId || !d.channel) return { error: "Conversación no encontrada." };
    const guardianId = user.role === "GUARDIAN" ? user.id : d.guardianId;
    if (!guardianId) return { error: "Elija a qué encargado escribir." };
    const link = await prisma.studentGuardian.findFirst({
      where: { studentId: d.studentId, userId: guardianId, student: { section: { schoolYear: { schoolId: user.schoolId } } } },
      include: { student: { include: { section: true } } },
    });
    if (!link) return { error: "No tiene acceso a este alumno." };
    if (!(await canWrite(user, { channel: d.channel, guardianId, student: link.student }))) return { error: "No puede escribir en esta conversación." };
    conv = await prisma.conversation.upsert({
      where: { studentId_guardianId_channel: { studentId: d.studentId, guardianId, channel: d.channel } },
      create: { schoolId: user.schoolId, studentId: d.studentId, guardianId, channel: d.channel },
      update: {},
      include: { student: { include: { section: true } } },
    });
  }
  if (!(await canWrite(user, conv))) return { error: "No puede escribir en esta conversación." };

  const now = new Date();
  await prisma.$transaction([
    prisma.message.create({ data: { conversationId: conv.id, senderId: user.id, body: d.body } }),
    prisma.conversation.update({ where: { id: conv.id }, data: { lastMessageAt: now } }),
    prisma.conversationRead.upsert({
      where: { conversationId_userId: { conversationId: conv.id, userId: user.id } },
      create: { conversationId: conv.id, userId: user.id, lastReadAt: now },
      update: { lastReadAt: now },
    }),
  ]);

  // Notificar a la otra parte
  const first = user.name.split(" ")[0];
  const preview = d.body.length > 90 ? d.body.slice(0, 87) + "…" : d.body;
  if (user.role === "GUARDIAN") {
    const to = await staffRecipients(user.schoolId, conv.channel, conv.student.section.teacherId);
    notifyLater(to, { title: `${first} (familia de ${conv.student.firstName})`, body: preview, url: `/escuela/mensajes/${conv.id}`, tag: conv.id });
  } else {
    notifyLater([conv.guardianId], { title: `${first} · San Cayetano School`, body: preview, url: `/familia/mensajes/${conv.studentId}/${conv.channel === "TEACHER" ? "docente" : "oficina"}`, tag: conv.id });
  }

  revalidatePath("/familia", "layout");
  revalidatePath("/escuela", "layout");
  return { sentAt: Date.now() };
}
