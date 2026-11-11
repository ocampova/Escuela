import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2, ChevronRight, Clock } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents } from "@/lib/queries";
import { relativeDay } from "@/lib/format";
import { Avatar, Card, SectionHeading, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Mensajes" };

export default async function FamilyMessages() {
  const user = await requireGuardian();
  if (!user.school.messagingEnabled) redirect("/familia");
  const [students, school, convs] = await Promise.all([
    guardianStudents(user.id),
    prisma.school.findUniqueOrThrow({ where: { id: user.schoolId }, select: { messageHours: true } }),
    prisma.conversation.findMany({
      where: { guardianId: user.id },
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        reads: { where: { userId: user.id } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Mensajes</h1>
        <p className="mt-1 text-sm text-ink-2">Escriba a la docente de su hijo o a la oficina de la escuela.</p>
        {school.messageHours && (
          <p className="mt-3 flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-sm text-ink-2 shadow-card">
            <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden /> {school.messageHours}
          </p>
        )}
      </div>

      {students.map((s) => (
        <section key={s.id}>
          <SectionHeading title={`${s.firstName} · ${s.section.grade.name} ${s.section.name}`} />
          <Card className="divide-y divide-line">
            {(["TEACHER", "OFFICE"] as const).map((ch) => {
              const c = convs.find((x) => x.studentId === s.id && x.channel === ch);
              const last = c?.messages[0];
              const unread = !!last && last.senderId !== user.id && (!c?.reads[0] || c.reads[0].lastReadAt < c.lastMessageAt);
              const title = ch === "TEACHER" ? (s.section.teacher?.name ?? "Docente guía") : "Oficina";
              const subtitle = ch === "TEACHER" ? "Docente guía" : "Dirección y Secretaría";
              return (
                <Link
                  key={ch}
                  href={`/familia/mensajes/${s.id}/${ch === "TEACHER" ? "docente" : "oficina"}`}
                  className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas"
                >
                  {ch === "TEACHER" ? (
                    <Avatar name={title} color={s.section.color} size={44} />
                  ) : (
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                      <Building2 className="size-5" aria-hidden />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cx("truncate", unread ? "font-semibold" : "font-medium")}>{title}</p>
                      {last && <span className="shrink-0 text-xs text-ink-3">{relativeDay(last.createdAt)}</span>}
                    </div>
                    <p className={cx("truncate text-sm", unread ? "font-medium text-ink" : "text-ink-2")}>
                      {last ? `${last.senderId === user.id ? "Usted: " : ""}${last.body}` : subtitle}
                    </p>
                  </div>
                  {unread ? <span className="size-2.5 shrink-0 rounded-full bg-scs-blue" aria-label="Mensaje nuevo" /> : <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />}
                </Link>
              );
            })}
          </Card>
        </section>
      ))}
    </div>
  );
}
