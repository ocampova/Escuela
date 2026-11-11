import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, Phone } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWrite, conversationScope, markConversationRead, threadMessages } from "@/lib/messages";
import { gradeSectionName } from "@/lib/format";
import { ChatThread } from "@/components/chat-thread";
import { Avatar, Badge } from "@/components/ui";

export const metadata: Metadata = { title: "Conversación" };

export default async function StaffThread({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff();
  if (!user.school.messagingEnabled) redirect("/escuela");
  const conv = await prisma.conversation.findFirst({
    where: { id, ...conversationScope(user) },
    include: { student: { include: { section: { include: { grade: true } } } }, guardian: { select: { name: true, phone: true } } },
  });
  if (!conv) notFound();
  const link = await prisma.studentGuardian.findUnique({ where: { studentId_userId: { studentId: conv.studentId, userId: conv.guardianId } } });
  const messages = await threadMessages(conv.id, user.id);
  await markConversationRead(conv.id, user.id);
  const writable = await canWrite(user, conv);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link href="/escuela/mensajes" aria-label="Volver a mensajes" className="-ml-2 flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar name={`${conv.student.firstName} ${conv.student.lastName}`} color={conv.student.section.color} size={42} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate font-semibold">
            {conv.guardian.name}
            {link && <span className="font-normal text-ink-2"> · {link.relationship}</span>}
          </h1>
          <p className="truncate text-sm text-ink-2">
            <Link href={`/escuela/alumnos/${conv.studentId}`} className="hover:underline">
              {conv.student.firstName} {conv.student.lastName}
            </Link>{" "}
            · {gradeSectionName(conv.student.section)}
          </p>
        </div>
        <Badge tone="brand">{conv.channel === "TEACHER" ? "Con la docente" : "Con la oficina"}</Badge>
        {conv.guardian.phone && (
          <a href={`tel:${conv.guardian.phone}`} className="inline-flex items-center gap-1 text-sm text-ink-2 hover:text-ink">
            <Phone className="size-4" aria-hidden /> {conv.guardian.phone}
          </a>
        )}
      </div>
      {conv.student.allergies && (
        <p className="mb-3 flex items-center gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          <AlertTriangle className="size-4" aria-hidden /> Alergia: {conv.student.allergies}
        </p>
      )}
      <div className="mt-auto">
        <ChatThread messages={messages} hidden={{ conversationId: conv.id }} canSend={writable} emptyText="Todavía no hay mensajes." placeholder={`Responder a ${conv.guardian.name.split(" ")[0]}…`} />
      </div>
    </div>
  );
}
