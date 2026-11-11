import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canWrite } from "@/lib/messages";
import { ChatThread } from "@/components/chat-thread";
import { Avatar } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo mensaje" };

export default async function NewThread({ searchParams }: { searchParams: Promise<{ alumno?: string; encargado?: string }> }) {
  const { alumno, encargado } = await searchParams;
  const user = await requireStaff();
  const link = await prisma.studentGuardian.findFirst({
    where: { studentId: alumno, userId: encargado, student: { section: { schoolYear: { schoolId: user.schoolId } } } },
    include: { user: { select: { name: true } }, student: { include: { section: true } } },
  });
  if (!link) notFound();
  const channel = user.role === "TEACHER" ? "TEACHER" : "OFFICE";
  if (!(await canWrite(user, { channel, guardianId: link.userId, student: link.student }))) redirect(`/escuela/alumnos/${link.studentId}`);
  const existing = await prisma.conversation.findUnique({ where: { studentId_guardianId_channel: { studentId: link.studentId, guardianId: link.userId, channel } } });
  if (existing) redirect(`/escuela/mensajes/${existing.id}`);

  return (
    <div className="flex min-h-[calc(100dvh-8rem)] max-w-3xl flex-col">
      <div className="mb-4 flex items-center gap-3">
        <Link href={`/escuela/alumnos/${link.studentId}`} aria-label="Volver" className="-ml-2 flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-surface hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <Avatar name={`${link.student.firstName} ${link.student.lastName}`} color={link.student.section.color} size={42} />
        <div>
          <h1 className="font-semibold">Mensaje para {link.user.name}</h1>
          <p className="text-sm text-ink-2">
            {link.relationship} de {link.student.firstName} · {channel === "TEACHER" ? "como docente guía" : "como oficina"}
          </p>
        </div>
      </div>
      <div className="mt-auto">
        <ChatThread messages={[]} hidden={{ studentId: link.studentId, guardianId: link.userId, channel }} emptyText="La familia recibirá una notificación en su celular." />
      </div>
    </div>
  );
}
