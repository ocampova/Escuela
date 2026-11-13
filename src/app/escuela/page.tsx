import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { announcementRecipients, audienceLabel, staffSections, statementFor } from "@/lib/queries";
import { crc, dateTimeLabel, gradeSectionName, keyToDate, relativeDay, timeLabel, todayKey } from "@/lib/format";
import { Badge, ButtonLink, Card, DemoNotice, SectionChip, SectionHeading } from "@/components/ui";
import { ReadMeter } from "@/components/read-meter";
import { EventDateTile } from "@/components/event-tile";
import { PushPrompt } from "@/components/push-prompt";
import { vapidPublicKey } from "@/lib/push";
import { TeacherToday } from "./mi-dia";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Costa_Rica", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches";
}

export default async function StaffHome() {
  const user = await requireStaff();
  const manager = isManager(user);
  const sections = await staffSections(user);
  const sectionIds = sections.map((s) => s.id);
  const today = keyToDate(todayKey());
  const weekday = new Date().getDay();
  const schoolDay = weekday !== 0 && weekday !== 6;

  const [attendance, notices, anns, events, students] = await Promise.all([
    prisma.attendance.findMany({ where: { date: today, student: { sectionId: { in: sectionIds } } }, select: { status: true, student: { select: { sectionId: true } } } }),
    prisma.absenceNotice.findMany({ where: { dateFrom: { lte: today }, dateTo: { gte: today }, student: { sectionId: { in: sectionIds } } }, include: { student: { select: { firstName: true, lastName: true, sectionId: true } } } }),
    prisma.announcement.findMany({
      where: { schoolId: user.schoolId, ...(manager ? {} : { OR: [{ sectionId: { in: sectionIds } }, { authorId: user.id }] }) },
      include: { level: true, section: { include: { grade: true } }, reads: { where: { acknowledgedAt: { not: null } }, select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.event.findMany({
      where: { schoolId: user.schoolId, startsAt: { gte: new Date(Date.now() - 6 * 3600_000) } },
      orderBy: { startsAt: "asc" },
      take: 4,
    }),
    manager
      ? prisma.student.findMany({ where: { sectionId: { in: sectionIds }, status: "ACTIVE" }, include: { section: { include: { grade: true } }, guardians: { where: { isPrimary: true }, include: { user: true } } } })
      : Promise.resolve([]),
  ]);

  const annStats = await Promise.all(
    anns.map(async (a) => {
      const recipients = await announcementRecipients(a);
      const ackIds = new Set(a.reads.map((r) => r.userId));
      return { a, total: recipients.length, done: recipients.filter((r) => ackIds.has(r.id)).length };
    }),
  );

  let debtors: { id: string; name: string; section: string; color: string; overdue: number; guardian?: string }[] = [];
  let totalOverdue = 0;
  if (manager) {
    const st = await statementFor(students.map((s) => s.id));
    debtors = students
      .map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        section: gradeSectionName(s.section),
        color: s.section.color,
        overdue: st.get(s.id)!.overdue,
        guardian: s.guardians[0]?.user.name,
      }))
      .filter((d) => d.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue);
    totalOverdue = debtors.reduce((s, d) => s + d.overdue, 0);
  }

  const firstName = user.name.split(" ")[0];
  const vapid = await vapidPublicKey();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-2 first-letter:uppercase">{dateTimeLabel(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex gap-2">
          {manager && (
            <ButtonLink href="/escuela/asistencia" variant="secondary">
              <ClipboardCheck className="size-4" aria-hidden /> Pasar lista
            </ButtonLink>
          )}
          <ButtonLink href="/escuela/avisos/nuevo">Nuevo aviso</ButtonLink>
        </div>
      </div>


      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-8">
          {!manager && <TeacherToday user={user} sections={sections} schoolDay={schoolDay} />}
          {!manager && <PushPrompt vapidKey={vapid} />}
          {/* Asistencia de hoy */}
          {manager && (
          <section>
            <SectionHeading
              title="Asistencia de hoy"
              action={
                <Link href="/escuela/asistencia" className="tap text-sm font-medium text-brand hover:underline">
                  Ir a asistencia
                </Link>
              }
            />
            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-canvas text-left text-xs text-ink-2">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Sección</th>
                    <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Docente</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Presentes</th>
                    <th className="hidden px-4 py-2.5 text-right font-medium sm:table-cell">Ausentes</th>
                    <th className="px-4 py-2.5 font-medium"><span className="sr-only">Estado</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {sections.map((s) => {
                    const rows = attendance.filter((a) => a.student.sectionId === s.id);
                    const present = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
                    const absent = rows.filter((r) => r.status === "ABSENT" || r.status === "EXCUSED").length;
                    const taken = rows.length > 0;
                    return (
                      <tr key={s.id}>
                        <td className="px-4 py-3">
                          <SectionChip color={s.color} label={gradeSectionName(s)} />
                        </td>
                        <td className="hidden px-4 py-3 text-ink-2 sm:table-cell">{s.teacher?.name.split(" ").slice(0, 2).join(" ")}</td>
                        <td className="tabular hidden px-4 py-3 text-right font-medium sm:table-cell">{taken ? `${present}/${s._count.students}` : "—"}</td>
                        <td className="tabular hidden px-4 py-3 text-right sm:table-cell">{taken ? absent : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          {!schoolDay ? (
                            <Badge>Sin lecciones</Badge>
                          ) : taken ? (
                            <Badge tone="ok">
                              <span className="tabular sm:hidden">{present}/{s._count.students} presentes</span>
                              <span className="hidden sm:inline">Lista pasada</span>
                            </Badge>
                          ) : (
                            <Link href={`/escuela/asistencia?seccion=${s.id}`}>
                              <Badge tone="warn" className="whitespace-nowrap">Falta pasar lista</Badge>
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          </section>
          )}

          {manager && <PushPrompt vapidKey={vapid} />}

          {manager && notices.length > 0 && (
            <section>
              <SectionHeading title={`Ausencias avisadas por las familias hoy (${notices.length})`} />
              <Card tone="flat" className="divide-y divide-line">
                {notices.map((n) => (
                  <div key={n.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm">
                    <span className="font-medium">
                      {n.student.firstName} {n.student.lastName}
                    </span>
                    <span className="text-ink-2">
                      {n.reason}
                      {n.note ? `: ${n.note}` : ""}
                    </span>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {/* Avisos */}
          <section>
            <SectionHeading
              title="Confirmación de avisos"
              action={
                <Link href="/escuela/avisos" className="tap text-sm font-medium text-brand hover:underline">
                  Ver todos
                </Link>
              }
            />
            <Card className="divide-y divide-line">
              {annStats.map(({ a, total, done }) => (
                <Link key={a.id} href={`/escuela/avisos/${a.id}`} className="block px-4 py-3.5 transition-colors hover:bg-canvas">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-medium">{a.title}</p>
                    <span className="shrink-0 text-xs text-ink-3">{relativeDay(a.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-2">{audienceLabel(a)}</p>
                  <ReadMeter done={done} total={total} className="mt-2.5" />
                </Link>
              ))}
            </Card>
          </section>
        </div>

        <div className="min-w-0 space-y-8">
          {manager && (
            <section>
              <SectionHeading
                title="Cobros vencidos"
                action={
                  <Link href="/escuela/cobros" className="tap text-sm font-medium text-brand hover:underline">
                    Ir a cobros
                  </Link>
                }
              />
              <Card>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
                  {totalOverdue > 0 ? <AlertCircle className="size-5 text-danger" aria-hidden /> : <CheckCircle2 className="size-5 text-ok" aria-hidden />}
                  <p className="text-sm">
                    {totalOverdue > 0 ? (
                      <>
                        <span className="tabular font-semibold">{crc(totalOverdue)}</span> vencidos en {debtors.length} {debtors.length === 1 ? "alumno" : "alumnos"}
                      </>
                    ) : (
                      "No hay montos vencidos."
                    )}
                  </p>
                </div>
                <ul className="divide-y divide-line">
                  {debtors.slice(0, 5).map((d) => (
                    <li key={d.id}>
                      <Link href={`/escuela/alumnos/${d.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{d.name}</p>
                          <p className="truncate text-xs text-ink-2">
                            {d.section}
                            {d.guardian ? ` · ${d.guardian}` : ""}
                          </p>
                        </div>
                        <span className="tabular text-sm font-semibold text-danger">{crc(d.overdue)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            </section>
          )}

          <section>
            <SectionHeading
              title="Próximos eventos"
              action={
                <Link href="/escuela/calendario" className="tap text-sm font-medium text-brand hover:underline">
                  Calendario
                </Link>
              }
            />
            <Card className="divide-y divide-line">
              {events.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-4 py-3">
                  <EventDateTile date={e.startsAt} kind={e.kind} className="size-11" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-ink-2">
                      {relativeDay(e.startsAt)}
                      {!e.allDay && ` · ${timeLabel(e.startsAt)}`}
                    </p>
                  </div>
                </div>
              ))}
              {events.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">No hay eventos próximos.</p>}
            </Card>
          </section>

          {!manager && (
            <Card className="p-4">
              <p className="text-sm text-ink-2">
                Ve la información de <span className="font-medium text-ink">{sections.map((s) => gradeSectionName(s)).join(", ")}</span>.
              </p>
              <Link href="/escuela/alumnos" className="tap mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline">
                Ver mis alumnos <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          )}
        </div>
      </div>
      <DemoNotice className="mt-10" />
    </div>
  );
}
