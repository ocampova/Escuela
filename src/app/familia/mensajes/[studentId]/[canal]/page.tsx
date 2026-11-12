import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CANAL, markConversationRead, threadMessages } from "@/lib/messages";
import { gradeSectionName } from "@/lib/format";
import { ChatThread } from "@/components/chat-thread";
import { Avatar } from "@/components/ui";

import { i18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Conversación") };
}

export default async function FamilyThread({ params }: { params: Promise<{ studentId: string; canal: string }> }) {
  const { studentId, canal } = await params;
  const channel = CANAL[canal as keyof typeof CANAL];
  if (!channel) notFound();
  const user = await requireGuardian();
  if (!user.school.messagingEnabled) redirect("/familia");
  const { t, locale } = await i18n();
  const student = await prisma.student.findFirst({
    where: { id: studentId, guardians: { some: { userId: user.id } } },
    include: { section: { include: { grade: true, teacher: { select: { name: true } } } } },
  });
  if (!student) notFound();
  const conv = await prisma.conversation.findUnique({ where: { studentId_guardianId_channel: { studentId, guardianId: user.id, channel } } });
  const messages = conv ? await threadMessages(conv.id, user.id) : [];
  if (conv) await markConversationRead(conv.id, user.id);

  const title = channel === "TEACHER" ? (student.section.teacher?.name ?? t("Docente guía")) : t("Oficina de la escuela");
  const subtitle = channel === "TEACHER" ? t("Docente guía de {section}", { section: gradeSectionName(student.section) }) : t("Dirección y Secretaría");

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-3xl flex-col md:min-h-[calc(100dvh-8rem)]">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/familia/mensajes" aria-label={t("Volver a mensajes")} className="-ml-2 flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        {channel === "TEACHER" ? (
          <Avatar name={title} color={student.section.color} size={40} />
        ) : (
          <span className="flex size-10 items-center justify-center rounded-full bg-brand text-white">
            <Building2 className="size-5" aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="truncate font-semibold">{title}</h1>
          <p className="truncate text-sm text-ink-2">
            {subtitle} · {t("sobre {name}", { name: student.firstName })}
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <ChatThread
          messages={messages}
          hidden={conv ? { conversationId: conv.id } : { studentId, channel }}
          emptyText={channel === "TEACHER" ? t("Escriba su primer mensaje a {name}.", { name: title.split(" ")[0] }) : t("Escriba su consulta a la oficina: pagos, documentos, matrícula…")}
          locale={locale}
        />
      </div>
    </div>
  );
}
