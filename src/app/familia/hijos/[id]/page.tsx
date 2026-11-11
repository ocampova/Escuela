import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, Phone, UserCheck } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { dateLabel, gradeSectionName } from "@/lib/format";
import { Avatar, Badge, Card, SectionHeading } from "@/components/ui";

const sectionBand: Record<string, string> = { orange: "bg-scs-orange-strong", green: "bg-scs-green-strong", blue: "bg-scs-blue-strong" };
import { AttendanceStrip } from "@/components/attendance-strip";

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireGuardian();
  const s = await prisma.student.findFirst({
    where: { id, guardians: { some: { userId: user.id } } },
    include: {
      section: { include: { grade: true, teacher: true } },
      pickups: true,
      guardians: { include: { user: true } },
      attendance: { orderBy: { date: "desc" }, take: 20 },
    },
  });
  if (!s) notFound();

  const counts = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 } as Record<string, number>;
  s.attendance.forEach((a) => counts[a.status]++);

  return (
    <div className="space-y-8">
      <div className={`full-bleed -mt-5 pt-3 pb-6 text-white md:-mt-8 md:pt-6 md:pb-10 ${sectionBand[s.section.color] ?? "bg-brand"}`}>
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
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8">
      <section>
        <SectionHeading title="Asistencia de las últimas 4 semanas" />
        <Card className="p-4">
          <AttendanceStrip records={[...s.attendance].reverse()} />
          <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
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
