import Link from "next/link";
import { AlertCircle, CheckCircle2, FileCheck2, Inbox, MessageCircle, Plus } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { announcementRecipients, audienceLabel, staffSections, statementFor } from "@/lib/queries";
import { crc, dateTimeLabel, gradeSectionName, keyToDate, relativeDay, timeLabel, todayKey } from "@/lib/format";
import { unreadConversations } from "@/lib/messages";
import { Badge, ButtonLink, Card, DemoNotice, SectionChip, SectionHeading } from "@/components/ui";
import { ReadMeter } from "@/components/read-meter";
import { EventDateTile } from "@/components/event-tile";
import { PushPrompt } from "@/components/push-prompt";
import { vapidPublicKey } from "@/lib/push";
import { Item, TeacherToday } from "./mi-dia";
import { RemindButton } from "./remind-button";

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Costa_Rica", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Buenos días" : h < 18 ? "Buenas tardes" : "Buenas noches";
}

/**
 * Panel por perfil (docs/ROLES.md):
 * - Docente: «Mi día», lo que tiene que hacer hoy.
 * - Dirección: supervisión (qué secciones pasaron lista, quién faltó, avisos, cobros, oficina).
 * - Secretaría: lo que tiene por atender (comprobantes, matrícula, mensajes de la oficina).
 */
export default async function StaffHome() {
  const user = await requireStaff();
  const role = user.role;
  const office = role === "ADMIN" || role === "STAFF";
  const sections = await staffSections(user);
  const sectionIds = sections.map((s) => s.id);
  const today = keyToDate(todayKey());
  const weekday = new Date(Date.now() - 6 * 3600_000).getUTCDay();
  const schoolDay = weekday !== 0 && weekday !== 6;

  const [attendance, notices, anns, events, students, reminded, pendingReports, newApplicants, unreadOffice] = await Promise.all([
    prisma.attendance.findMany({
      where: { date: today, student: { sectionId: { in: sectionIds }, status: "ACTIVE" } },
      select: { status: true, note: true, student: { select: { id: true, firstName: true, lastName: true, sectionId: true } } },
    }),
    prisma.absenceNotice.findMany({
      where: { dateFrom: { lte: today }, dateTo: { gte: today }, student: { sectionId: { in: sectionIds }, status: "ACTIVE" } },
      include: { student: { select: { id: true, firstName: true, lastName: true, section: { include: { grade: true } } } } },
    }),
    prisma.announcement.findMany({
      where: { schoolId: user.schoolId, ...(office ? {} : { OR: [{ sectionId: { in: sectionIds } }, { authorId: user.id }] }) },
      include: { level: true, section: { include: { grade: true } }, reads: { where: { acknowledgedAt: { not: null } }, select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.event.findMany({ where: { schoolId: user.schoolId, startsAt: { gte: new Date(Date.now() - 6 * 3600_000) } }, orderBy: { startsAt: "asc" }, take: 4 }),
    office
      ? prisma.student.findMany({ where: { sectionId: { in: sectionIds }, status: "ACTIVE" }, include: { section: { include: { grade: true } }, guardians: { where: { isPrimary: true }, include: { user: true } } } })
      : Promise.resolve([]),
    role === "ADMIN" ? prisma.reminderLog.findMany({ where: { day: today, kind: { startsWith: "lista-" } }, select: { kind: true } }) : Promise.resolve([]),
    office ? prisma.paymentReport.count({ where: { status: "PENDING", student: { section: { schoolYear: { schoolId: user.schoolId } } } } }) : Promise.resolve(0),
    office ? prisma.applicant.count({ where: { schoolId: user.schoolId, status: "NEW" } }) : Promise.resolve(0),
    role === "STAFF" && user.school.messagingEnabled ? unreadConversations(user) : Promise.resolve(0),
  ]);

  const annStats = await Promise.all(
    anns.map(async (a) => {
      const recipients = await announcementRecipients(a);
      const ackIds = new Set(a.reads.map((r) => r.userId));
      return { a, total: recipients.length, done: recipients.filter((r) => ackIds.has(r.id)).length };
    }),
  );

  let debtors: { id: string; name: string; section: string; overdue: number; guardian?: string }[] = [];
  let totalOverdue = 0;
  if (office) {
    const st = await statementFor(students.map((s) => s.id));
    debtors = students
      .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, section: gradeSectionName(s.section), overdue: st.get(s.id)!.overdue, guardian: s.guardians[0]?.user.name }))
      .filter((d) => d.overdue > 0)
      .sort((a, b) => b.overdue - a.overdue);
    totalOverdue = debtors.reduce((s, d) => s + d.overdue, 0);
  }

  const vapid = await vapidPublicKey();
  const remindedSet = new Set(reminded.map((r) => r.kind.slice("lista-".length)));
  const absentToday = attendance.filter((a) => a.status === "ABSENT" || a.status === "LATE" || a.status === "EXCUSED");
  const missingLists = schoolDay ? sections.filter((s) => s._count.students > 0 && !attendance.some((a) => a.student.sectionId === s.id)) : [];

  /* ---------- Bloques ---------- */

  const supervision = (
    <section>
      <SectionHeading
        title="Asistencia de hoy"
        action={
          <span className="text-sm text-ink-2">
            {!schoolDay ? "Sin lecciones" : missingLists.length ? `Faltan ${missingLists.length} de ${sections.length}` : "Todas al día"}
          </span>
        }
      />
      <Card className="divide-y divide-line">
        {sections.map((s) => {
          const rows = attendance.filter((a) => a.student.sectionId === s.id);
          const present = rows.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
          const taken = rows.length > 0;
          const teacher = s.teacher?.name.split(" ")[0];
          return (
            <div key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3">
              <div className="min-w-0 flex-1">
                <SectionChip color={s.color} label={gradeSectionName(s)} />
                <p className="mt-1 text-xs text-ink-2">{s.teacher ? s.teacher.name.split(" ").slice(0, 2).join(" ") : "Sin docente asignada"}</p>
              </div>
              {!schoolDay ? (
                <Badge>Sin lecciones</Badge>
              ) : taken ? (
                <span className="tabular text-sm text-ink-2">
                  <span className="font-semibold text-ink">{present}</span>/{s._count.students} presentes
                </span>
              ) : (
                <div className="flex flex-col items-end gap-1">
                  <Badge tone="warn" className="whitespace-nowrap">Falta pasar lista</Badge>
                  {teacher && <RemindButton sectionId={s.id} teacher={teacher} sent={remindedSet.has(s.id)} />}
                </div>
              )}
            </div>
          );
        })}
      </Card>
    </section>
  );

  const absences = (title: string) =>
    (absentToday.length > 0 || notices.length > 0) && (
      <section>
        <SectionHeading title={title} />
        <Card tone="flat" className="divide-y divide-line">
          {notices.map((n) => (
            <Link key={n.id} href={`/escuela/alumnos/${n.student.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm transition-colors hover:bg-canvas">
              <span className="font-medium">
                {n.student.firstName} {n.student.lastName} <span className="font-normal text-ink-3">· {gradeSectionName(n.student.section)}</span>
              </span>
              <span className="text-ink-2">
                Avisó la familia: {n.reason}
                {n.note ? `, ${n.note}` : ""}
              </span>
            </Link>
          ))}
          {role === "ADMIN" &&
            absentToday
              .filter((a) => !notices.some((n) => n.student.id === a.student.id))
              .map((a) => (
                <Link key={a.student.id} href={`/escuela/alumnos/${a.student.id}`} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 px-4 py-2.5 text-sm transition-colors hover:bg-canvas">
                  <span className="font-medium">
                    {a.student.firstName} {a.student.lastName}
                  </span>
                  <span className={a.status === "ABSENT" ? "text-danger" : a.status === "LATE" ? "text-warn" : "text-ink-2"}>
                    {a.status === "ABSENT" ? "Ausente sin aviso" : a.status === "LATE" ? "Llegó tarde" : "Justificada"}
                    {a.note ? ` · ${a.note}` : ""}
                  </span>
                </Link>
              ))}
        </Card>
      </section>
    );

  const officeTasks = (
    <section>
      <SectionHeading title="Por atender" />
      <Card>
        <ul className="divide-y divide-line">
          <Item
            icon={<FileCheck2 className="size-5" aria-hidden />}
            title={pendingReports ? `${pendingReports} ${pendingReports === 1 ? "comprobante de pago por revisar" : "comprobantes de pago por revisar"}` : "Sin comprobantes por revisar"}
            done={!pendingReports}
            href="/escuela/cobros"
            detail={pendingReports ? "Las familias los subieron desde la plataforma. Al aprobarlos, el pago se aplica y la familia recibe su recibo." : undefined}
          />
          <Item
            icon={<Inbox className="size-5" aria-hidden />}
            title={newApplicants ? `${newApplicants} ${newApplicants === 1 ? "solicitud de matrícula nueva" : "solicitudes de matrícula nuevas"}` : "Sin solicitudes de matrícula nuevas"}
            done={!newApplicants}
            href="/escuela/matricula"
          />
          {role === "STAFF" && user.school.messagingEnabled && (
            <Item
              icon={<MessageCircle className="size-5" aria-hidden />}
              title={unreadOffice ? `${unreadOffice} ${unreadOffice === 1 ? "mensaje de la oficina sin responder" : "mensajes de la oficina sin responder"}` : "Mensajes de la oficina al día"}
              done={!unreadOffice}
              href="/escuela/mensajes"
            />
          )}
        </ul>
      </Card>
    </section>
  );

  const overdue = (
    <section>
      <SectionHeading
        title="Cobros vencidos"
        action={
          <Link href="/escuela/cobros?filtro=vencidos" className="tap text-sm font-medium text-brand hover:underline">
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
  );

  const notifications = (
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
        {annStats.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">Todavía no hay avisos.</p>}
      </Card>
    </section>
  );

  const upcoming = (
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
  );

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-ink-2 first-letter:uppercase">{dateTimeLabel(new Date(), { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {role === "STAFF" && (
            <ButtonLink href="/escuela/cobros" variant="secondary">
              <Plus className="size-4" aria-hidden /> Registrar pago
            </ButtonLink>
          )}
          <ButtonLink href="/escuela/avisos/nuevo">Nuevo aviso</ButtonLink>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="min-w-0 space-y-8">
          {role === "TEACHER" && <TeacherToday user={user} sections={sections} schoolDay={schoolDay} />}
          {role === "ADMIN" && supervision}
          {role === "ADMIN" && absences("Ausencias de hoy")}
          {role === "STAFF" && officeTasks}
          {role === "STAFF" && absences("Ausencias avisadas por las familias")}
          <PushPrompt vapidKey={vapid} />
          {notifications}
        </div>

        <div className="min-w-0 space-y-8">
          {role === "ADMIN" && officeTasks}
          {office && overdue}
          {upcoming}
        </div>
      </div>
      <DemoNotice className="mt-10" />
    </div>
  );
}
