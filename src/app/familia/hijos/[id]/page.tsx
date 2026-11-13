import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, CalendarX, CheckCircle2, Phone, UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { dateLabel, gradeSectionName, keyToDate, todayKey } from "@/lib/format";
import { Avatar, Badge, Card, SectionHeading } from "@/components/ui";

const sectionBand: Record<string, string> = {
  orange: "bg-scs-orange-strong [--bleed-color:var(--color-scs-orange-strong)]",
  green: "bg-scs-green-strong [--bleed-color:var(--color-scs-green-strong)]",
  blue: "bg-scs-blue-strong [--bleed-color:var(--color-scs-blue-strong)]",
};
import { AttendanceStrip } from "@/components/attendance-strip";
import { DailyReportView } from "@/components/daily-report";
import { capitalize } from "@/lib/format";
import { HomeworkRow } from "@/components/homework-row";
import { FileText } from "lucide-react";

export default async function ChildPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ausencia?: string }> }) {
  const { id } = await params;
  const { ausencia } = await searchParams;
  const user = await requireGuardian();
  const s = await prisma.student.findFirst({
    where: { id, guardians: { some: { userId: user.id } } },
    include: {
      section: { include: { grade: { include: { level: true } }, teacher: true } },
      pickups: true,
      guardians: { include: { user: true } },
      attendance: { orderBy: { date: "desc" }, take: 20 },
      absenceNotices: { where: { dateTo: { gte: keyToDate(todayKey()) } }, orderBy: { dateFrom: "asc" } },
      dailyReports: { where: { sentAt: { not: null } }, orderBy: { day: "desc" }, take: 5 },
    },
  });
  if (!s) notFound();
  const albums = await prisma.album.findMany({
    where: { sectionId: s.sectionId },
    include: { photos: { select: { id: true }, orderBy: { order: "asc" }, take: 1 }, _count: { select: { photos: true } } },
    orderBy: [{ day: "desc" }, { createdAt: "desc" }],
    take: 3,
  });
  const today = keyToDate(todayKey());
  const [homework, publications] = await Promise.all([
    prisma.homework.findMany({ where: { sectionId: s.sectionId, dueDate: { gte: today } }, include: { subject: true }, orderBy: { dueDate: "asc" }, take: 5 }),
    prisma.termPublication.findMany({ where: { sectionId: s.sectionId }, include: { term: true }, orderBy: { term: { order: "desc" } } }),
  ]);
  const descriptive = s.section.grade.level.evaluation === "DESCRIPTIVE";
  const lastReport = s.dailyReports[0];

  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 } as Record<string, number>;
  s.attendance.forEach((a) => counts[a.status]++);

  return (
    <div className="space-y-8">
      <div className={`full-bleed -mt-5 pt-3 pb-6 text-white md:-mt-8 md:pt-6 md:pb-10 ${sectionBand[s.section.color] ?? "bg-brand [--bleed-color:var(--color-brand)]"}`}>
        <Link href="/familia" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white">
          <ArrowLeft className="size-4" aria-hidden /> Inicio
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <Avatar name={`${s.firstName} ${s.lastName}`} color="onBrand" size={64} className="ring-2 ring-white/30" />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold">
              {s.firstName} {s.lastName}
            </h1>
            <p className="mt-1 text-sm text-white/85">
              {gradeSectionName(s.section)}
              {s.section.teacher && ` · Docente: ${s.section.teacher.name}`}
            </p>
            <Link href={`/familia/hijos/${s.id}/ausencia`} className="mt-3 inline-flex h-9 items-center gap-2 rounded-lg bg-white/15 px-3 text-sm font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/25">
              <CalendarX className="size-4" aria-hidden /> Avisar una ausencia
            </Link>
          </div>
        </div>
      </div>

      {ausencia && (
        <p role="status" className="ack-in flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden /> Listo, la docente recibió su aviso.
        </p>
      )}
      {s.absenceNotices.length > 0 && (
        <Card className="p-4">
          <p className="mb-2 text-sm font-medium">Ausencias avisadas</p>
          <ul className="space-y-1 text-sm text-ink-2">
            {s.absenceNotices.map((n) => (
              <li key={n.id}>
                {dateLabel(n.dateFrom, { weekday: "short", day: "numeric", month: "short" })}
                {n.dateTo.getTime() !== n.dateFrom.getTime() ? ` al ${dateLabel(n.dateTo, { weekday: "short", day: "numeric", month: "short" })}` : ""}: {n.reason}
                {n.note ? `, ${n.note}` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}
      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
      {lastReport && (
        <section>
          <SectionHeading title={lastReport.day.getTime() !== today.getTime() ? `Reporte del ${dateLabel(lastReport.day, { weekday: "long", day: "numeric", month: "short" })}` : "Hoy en clase"} />
          <Card className="p-4">
            <DailyReportView report={lastReport} />
          </Card>
          {s.dailyReports.length > 1 && (
            <details className="group mt-2">
              <summary className="tap cursor-pointer list-none text-sm font-medium text-brand hover:underline">Días anteriores</summary>
              <div className="mt-2 space-y-3">
                {s.dailyReports.slice(1).map((r) => (
                  <Card key={r.id} tone="flat" className="p-4">
                    <p className="mb-2 text-sm font-medium">{capitalize(dateLabel(r.day, { weekday: "long", day: "numeric", month: "short" }))}</p>
                    <DailyReportView report={r} compact />
                  </Card>
                ))}
              </div>
            </details>
          )}
        </section>
      )}

      {homework.length > 0 && (
        <section>
          <SectionHeading
            title="Tareas"
            action={
              <Link href="/familia/tareas" className="tap text-sm font-medium text-brand hover:underline">
                Ver todas
              </Link>
            }
          />
          <Card className="divide-y divide-line">
            {homework.map((h) => <HomeworkRow key={h.id} h={h} />)}
          </Card>
        </section>
      )}

      {publications.length > 0 && (
        <section>
          <SectionHeading title={descriptive ? "Informes al hogar" : "Boletas"} />
          <Card className="divide-y divide-line">
            {publications.map((p) => (
              <Link key={p.id} href={`/boletas/${s.id}/${p.termId}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-canvas">
                <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                  <FileText className="size-[18px]" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 font-medium">{p.term.name}</span>
                <span className="text-sm font-medium text-brand">Ver</span>
              </Link>
            ))}
          </Card>
        </section>
      )}

      <section>
        <SectionHeading title="Asistencia de las últimas 4 semanas" />
        <Card className="p-4">
          <AttendanceStrip records={[...s.attendance].reverse()} />
          <dl className="mt-4 grid grid-cols-2 gap-2 text-center min-[360px]:grid-cols-4">
            {[
              ["Presente", counts.PRESENT, "text-ok"],
              ["Tardías", counts.LATE, "text-warn"],
              ["Ausencias", counts.ABSENT, "text-danger"],
              ["Justificadas", counts.EXCUSED, "text-ink-2"],
            ].map(([label, n, c]) => (
              <div key={label as string} className="rounded-lg bg-canvas py-2">
                <dt className="text-xs text-ink-2">{label}</dt>
                <dd className={`tabular text-lg font-semibold ${c}`}>{n}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </section>

      <section>
        <SectionHeading title="Salud" />
        <Card className="divide-y divide-line">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-ink-2">Alergias</span>
            {s.allergies ? (
              <Badge tone="danger">
                <AlertTriangle className="size-3.5" aria-hidden /> {s.allergies}
              </Badge>
            ) : (
              <span className="text-sm">Ninguna registrada</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-ink-2">Tipo de sangre</span>
            <span className="text-sm font-medium">{s.bloodType ?? "Sin dato"}</span>
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm text-ink-2">Fecha de nacimiento</span>
            <span className="text-sm font-medium">{dateLabel(s.birthDate, { day: "numeric", month: "long", year: "numeric" })}</span>
          </div>
        </Card>
      </section>

        </div>
        <div className="min-w-0 space-y-8">
      {albums.length > 0 && (
        <section>
          <SectionHeading
            title="Fotos de la sección"
            action={
              <Link href="/familia/fotos" className="tap text-sm font-medium text-brand hover:underline">
                Ver todas
              </Link>
            }
          />
          <ul className="grid grid-cols-3 gap-2">
            {albums.map((a) => (
              <li key={a.id}>
                <Link href={`/familia/fotos/${a.id}`} className="group block">
                  <div className="aspect-square overflow-hidden rounded-xl bg-canvas">
                    {a.photos[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/fotos/${a.photos[0].id}`} alt="" loading="lazy" className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.04]" />
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs font-medium">{a.title}</p>
                  <p className="text-xs text-ink-3">{a._count.photos} fotos</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <SectionHeading title="Personas autorizadas para recoger" />
        <Card className="divide-y divide-line">
          {s.pickups.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft text-brand">
                <UserCheck className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-ink-2">
                  {p.relationship} · Cédula {p.idNumber}
                </p>
              </div>
            </div>
          ))}
        </Card>
        <p className="mt-2 text-xs text-ink-3">Para agregar o quitar personas autorizadas, comuníquese con Secretaría.</p>
      </section>

      <section>
        <SectionHeading title="Encargados" />
        <Card className="divide-y divide-line">
          {s.guardians.map((g) => (
            <div key={g.userId} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={g.user.name} size={36} />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{g.user.name}</p>
                <p className="text-sm text-ink-2">
                  {g.relationship}
                  {g.isPrimary ? " · Encargado principal" : ""}
                </p>
              </div>
              {g.user.phone && (
                <span className="inline-flex items-center gap-1 text-sm text-ink-2">
                  <Phone className="size-3.5" aria-hidden /> {g.user.phone}
                </span>
              )}
            </div>
          ))}
        </Card>
      </section>
        </div>
      </div>
    </div>
  );
}
