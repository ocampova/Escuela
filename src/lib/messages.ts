import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CurrentUser } from "./auth";
import { dateTimeLabel, relativeDay, timeLabel } from "./format";

export const CHANNEL_LABEL = { TEACHER: "Docente", OFFICE: "Oficina" } as const;

/** Conversaciones que puede ver cada rol. */
export function conversationScope(user: CurrentUser): Prisma.ConversationWhereInput {
  const base = { schoolId: user.schoolId };
  switch (user.role) {
    case "GUARDIAN":
      return { ...base, guardianId: user.id };
    case "TEACHER":
      return { ...base, channel: "TEACHER", student: { section: { teacherId: user.id } } };
    case "STAFF":
      return { ...base, channel: "OFFICE" };
    default:
      return base; // Dirección ve todas
  }
}

export async function canWrite(user: CurrentUser, conv: { channel: string; guardianId: string; student: { section: { teacherId: string | null } } }) {
  if (user.role === "GUARDIAN") return conv.guardianId === user.id;
  if (conv.channel === "TEACHER") return user.role === "ADMIN" || conv.student.section.teacherId === user.id;
  return user.role === "ADMIN" || user.role === "STAFF";
}

/** Hilos con mensajes nuevos de la otra parte. */
export async function unreadConversations(user: CurrentUser) {
  const convs = await prisma.conversation.findMany({
    where: conversationScope(user),
    select: { id: true, lastMessageAt: true, reads: { where: { userId: user.id }, select: { lastReadAt: true } } },
  });
  const candidates = convs.filter((c) => !c.reads[0] || c.reads[0].lastReadAt < c.lastMessageAt);
  if (candidates.length === 0) return 0;
  // Solo cuentan si el último mensaje no es mío
  const last = await prisma.message.findMany({
    where: { conversationId: { in: candidates.map((c) => c.id) } },
    orderBy: { createdAt: "desc" },
    distinct: ["conversationId"],
    select: { senderId: true },
  });
  return last.filter((m) => m.senderId !== user.id).length;
}

/** Personas de la escuela que reciben los mensajes de una familia. */
export async function staffRecipients(schoolId: string, channel: "TEACHER" | "OFFICE", teacherId: string | null) {
  if (channel === "TEACHER") return teacherId ? [teacherId] : [];
  const office = await prisma.user.findMany({ where: { schoolId, role: { in: ["ADMIN", "STAFF"] }, active: true }, select: { id: true } });
  return office.map((u) => u.id);
}


export async function threadMessages(conversationId: string, viewerId: string) {
  const msgs = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { sender: { select: { name: true, role: true } } },
  });
  return msgs.map((m) => ({
    id: m.id,
    body: m.body,
    mine: m.senderId === viewerId,
    sender: `${m.sender.name.split(" ").slice(0, 2).join(" ")}${m.sender.role === "ADMIN" ? " · Dirección" : m.sender.role === "STAFF" ? " · Secretaría" : m.sender.role === "TEACHER" ? " · Docente" : ""}`,
    time: timeLabel(m.createdAt),
    day: relativeDay(m.createdAt) === "Hoy" || relativeDay(m.createdAt) === "Ayer" ? relativeDay(m.createdAt) : dateTimeLabel(m.createdAt, { weekday: "long", day: "numeric", month: "long" }),
  }));
}

export async function markConversationRead(conversationId: string, userId: string) {
  await prisma.conversationRead.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    create: { conversationId, userId },
    update: { lastReadAt: new Date() },
  });
}

export const CANAL = { docente: "TEACHER", oficina: "OFFICE" } as const;
