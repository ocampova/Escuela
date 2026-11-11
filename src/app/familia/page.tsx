import Link from "next/link";
import { ArrowRight, CalendarDays, CalendarX, CheckCircle2, ChevronRight, Wallet } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { eventFilter, guardianAnnouncements, guardianStudents, statementFor, isPending } from "@/lib/queries";
import { crc, dateLabel, dateTimeLabel, gradeSectionName, keyToDate, relativeDay, timeLabel, todayKey } from "@/lib/format";
import { AckButton } from "@/components/ack-button";
import { Avatar, Badge, Card, DemoNotice, SectionChip, SectionHeading, buttonClass } from "@/components/ui";
import { EventDateTile } from "@/components/event-tile";
import { PushPrompt } from "@/components/push-prompt";
import { AnnouncementThumb } from "@/components/announcement-images";
import { vapidPublicKey } from "@/lib/push";

const ATT: Record<string, { label: string; tone: "ok" | "warn" | "danger" | "neutral" }> = {
  PRESENT: { label: "Presente hoy", tone: "ok" },
  LATE: { label: "Llegó tarde hoy", tone: "warn" },
  ABSENT: { label: "Ausente hoy", tone: "danger" },
  EXCUSED: { label: "Ausencia justificada", tone: "neutral" },
};

export default async function FamilyHome() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const ids = students.map((s) => s.id);
  const today = keyToDate(todayKey());

  const [anns, attendance, events, statements] = await Promise.all([
    guardianAnnouncements(user, students),
    prisma.attendance.findMany({ where: { studentId: { in: ids }, date: today } }),
    prisma.event.findMany({
      where: { schoolId: user.schoolId, startsAt: { gte: new Date(Date.now() - 6 * 3600_000) }, ...eventFilter(students) },
      include: { section: { include: { grade: true } }, level: true },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
    statementFor(ids),
  ]);

  const pending = anns.filter((a) => isPending(a, students));
  const recent = anns.filter((a) => !pending.includes(a)).slice(0, 3);
  const balances = [...statements.values()];
  const due = balances.reduce((s, b) => s + (b.charged - b.paid), 0);
  const overdue = balances.reduce((s, b) => s + b.overdue, 0);
  const nextDue = balances.map((b) => b.nextDue).filter(Boolean).sort((a, b) => a!.date.getTime() - b!.date.getTime())[0];
  const firstName = user.name.split(" ")[0];
  const weekday = dateTimeLabel(new Date(), { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-8 md:space-y-10">
      <div className="full-bleed -mt-5 bg-brand [--bleed-color:var(--color-brand)] pt-5 pb-6 text-white md:-mt-8 md:pt-8 md:pb-10">
        <h1 className="text-[1.75rem] leading-tight font-semibold md:text-4xl">Hola, {firstName}</h1>
        <p className="mt-1 text-sm text-white/75 first-letter:uppercase md:text-base">{weekday}</p>

        {/* Hijos */}
        <section aria-label="Mis hijos" className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:mt-6 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-3">
          {students.map((s) => {
            const att = attendance.find((a) => a.studentId === s.id);
            const st = att ? ATT[att.status] : null;
            return (
              <Link
                key={s.id}
                href={`/familia/hijos/${s.id}`}
                className="flex min-w-[80%] snap-start flex-col rounded-xl bg-surface text-ink shadow-pop transition-[transform,box-shadow] duration-200 ease-out active:scale-[0.99] sm:min-w-[calc(50%-6px)] md:min-w-0 md:hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-3 p-4">
                  <Avatar name={`${s.firstName} ${s.lastName}`} color={s.section.color} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[17px] font-semibold">{s.firstName}</p>
                    <SectionChip color={s.section.color} label={gradeSectionName(s.section)} className="mt-1" />
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-2.5 text-sm">
                  <span className="truncate text-ink-2">{s.section.teacher ? `Docente: ${s.section.teacher.name.split(" ").slice(0, 2).join(" ")}` : "Sin docente asignada"}</span>
                  {st ? <Badge tone={st.tone}>{st.label}</Badge> : <Badge>Sin registro hoy</Badge>}
                </div>
              </Link>
            );
          })}
        </section>
        <div className="mt-4 flex flex-wrap gap-2">
          {students.map((s) => (
            <Link
              key={s.id}
              href={`/familia/hijos/${s.id}/ausencia`}
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-medium text-white ring-1 ring-white/20 transition-colors hover:bg-white/20"
            >
              <CalendarX className="size-4" aria-hidden /> {students.length > 1 ? `Avisar ausencia de ${s.firstName}` : "Avisar una ausencia"}
            </Link>
          ))}
        </div>
      </div>

      <PushPrompt vapidKey={await vapidPublicKey()} className="lg:max-w-3xl" />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
      {/* Pendiente */}
      {(pending.length > 0 || due > 0) && (
        <section>
          <SectionHeading title="Necesita su atención" />
          <div className="space-y-3">
            {due > 0 && (
              <Link href="/familia/cuenta" className="block">
                <Card className="flex items-center gap-4 p-4 transition-shadow hover:shadow-pop">
                  <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${overdue > 0 ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"}`}>
                    <Wallet className="size-5" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-2">{overdue > 0 ? "Saldo vencido" : "Saldo por pagar"}</p>
                    <p className="tabular text-xl font-semibold">{crc(due)}</p>
                    {nextDue && (
                      <p className="mt-0.5 text-sm text-ink-2">
                        {nextDue.description} · vence {dateLabel(nextDue.date, { day: "numeric", month: "long" })}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="size-5 shrink-0 text-ink-3" aria-hidden />
                </Card>
              </Link>
            )}
            {pending.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/familia/avisos/${a.id}`} className="group min-w-0">
                    <p className="font-medium text-ink group-hover:underline">{a.title}</p>
                    <p className="mt-1 text-sm text-ink-2">
                      {a.author.name.split(" ").slice(0, 2).join(" ")} · {relativeDay(a.createdAt)}
                    </p>
                  </Link>
                  {a.images[0] ? (
                    <Link href={`/familia/avisos/${a.id}`} className="shrink-0" aria-label={`Ver imagen de ${a.title}`}>
                      <AnnouncementThumb id={a.images[0].id} className="size-16" />
                    </Link>
                  ) : (
                    a.section && <SectionChip color={a.section.color} label={gradeSectionName(a.section)} className="shrink-0" />
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <Link href={`/familia/avisos/${a.id}`} className="text-sm font-medium text-brand hover:underline">
                    Leer aviso
                  </Link>
                  {a.permissionQuestion ? (
                    <Link href={`/familia/avisos/${a.id}`} className={buttonClass("primary", "sm", "h-9")}>
                      Responder autorización
                    </Link>
                  ) : (
                    <AckButton id={a.id} acknowledged={false} />
                  )}
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {pending.length === 0 && due === 0 && (
        <Card className="flex items-center gap-3 p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ok-soft text-ok">
            <CheckCircle2 className="size-5" aria-hidden />
          </span>
          <p className="text-sm text-ink-2">
            <span className="font-medium text-ink">Todo al día.</span> No tiene avisos por confirmar ni pagos pendientes.
          </p>
        </Card>
      )}

      {/* Avisos recientes */}
      {recent.length > 0 && (
        <section>
          <SectionHeading
            title="Avisos recientes"
            action={
              <Link href="/familia/avisos" className="text-sm font-medium text-brand hover:underline">
                Ver todos
              </Link>
            }
          />
          <Card tone="flat" className="divide-y divide-line">
            {recent.map((a) => (
              <Link key={a.id} href={`/familia/avisos/${a.id}`} className="flex items-center gap-3 p-4 transition-colors hover:bg-canvas">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{a.title}</p>
                  <p className="text-sm text-ink-2">{relativeDay(a.createdAt)}</p>
                </div>
                <ChevronRight className="size-5 shrink-0 text-ink-3" aria-hidden />
              </Link>
            ))}
          </Card>
        </section>
      )}

        </div>
        <div className="min-w-0 space-y-8 lg:sticky lg:top-24">
      {/* Próximos eventos */}
      <section>
        <SectionHeading
          title="Próximamente"
          action={
            <Link href="/familia/calendario" className="text-sm font-medium text-brand hover:underline">
              Ver calendario
            </Link>
          }
        />
        <Card tone="flat" className="divide-y divide-line">
          {events.length === 0 && (
            <p className="flex items-center gap-2 p-4 text-sm text-ink-2">
              <CalendarDays className="size-4" aria-hidden /> No hay eventos en los próximos días.
            </p>
          )}
          {events.map((e) => (
            <div key={e.id} className="flex items-center gap-3 p-4">
              <EventDateTile date={e.startsAt} kind={e.kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="truncate text-sm text-ink-2">
                  {relativeDay(e.startsAt)}
                  {!e.allDay && ` · ${timeLabel(e.startsAt)}`}
                  {e.section ? ` · ${gradeSectionName(e.section)}` : e.level ? ` · ${e.level.name}` : ""}
                </p>
              </div>
            </div>
          ))}
        </Card>
      </section>

        </div>
      </div>

      <DemoNotice className="text-center" />
    </div>
  );
}
