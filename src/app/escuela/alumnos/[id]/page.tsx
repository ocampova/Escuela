import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, UserCheck } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { METHOD_LABEL, staffSections, statementFor } from "@/lib/queries";
import { crc, dateLabel, gradeSectionName } from "@/lib/format";
import { Avatar, Badge, Card, SectionChip, SectionHeading } from "@/components/ui";
import { AttendanceStrip } from "@/components/attendance-strip";

export default async function StaffStudent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff();
  const sections = await staffSections(user);
  const s = await prisma.student.findFirst({
    where: { id, sectionId: { in: sections.map((x) => x.id) } },
    include: {
      section: { include: { grade: true, teacher: true } },
      guardians: { include: { user: true }, orderBy: { isPrimary: "desc" } },
      pickups: true,
      attendance: { orderBy: { date: "desc" }, take: 20 },
    },
  });
  if (!s) notFound();
  const manager = isManager(user);
  const statement = manager ? (await statementFor([s.id])).get(s.id)! : null;

  const info: [string, string][] = [
    ["Cédula", s.idNumber ?? "Sin dato"],
    ["Nacimiento", dateLabel(s.birthDate, { day: "numeric", month: "long", year: "numeric" })],
    ["Tipo de sangre", s.bloodType ?? "Sin dato"],
    ["Docente guía", s.section.teacher?.name ?? "Sin asignar"],
  ];

  return (
    <div>
      <Link href="/escuela/alumnos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Alumnos
      </Link>
      <div className="mt-3 mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={`${s.firstName} ${s.lastName}`} color={s.section.color} size={64} />
        <div>
          <h1 className="text-2xl font-semibold">
            {s.firstName} {s.lastName}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <SectionChip color={s.section.color} label={gradeSectionName(s.section)} />
            {s.allergies && (
              <Badge tone="danger">
                <AlertTriangle className="size-3.5" aria-hidden /> Alergia: {s.allergies}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <section>
            <SectionHeading title="Datos" />
            <Card>
              <dl className="divide-y divide-line">
                {info.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="text-right font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
          <section>
            <SectionHeading title="Encargados" />
            <Card className="divide-y divide-line">
              {s.guardians.map((g) => (
                <div key={g.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={g.user.name} size={36} />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">{g.user.name}</p>
                    <p className="text-ink-2">
                      {g.relationship}
                      {g.isPrimary ? " · Principal" : ""} · {g.user.email}
                    </p>
                  </div>
                  <span className="tabular text-sm text-ink-2">{g.user.phone}</span>
                </div>
              ))}
            </Card>
          </section>
          <section>
            <SectionHeading title="Autorizados para recoger" />
            <Card className="divide-y divide-line">
              {s.pickups.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <UserCheck className="size-4 shrink-0 text-brand" aria-hidden />
                  <p className="min-w-0 flex-1 font-medium">{p.name}</p>
                  <span className="text-ink-2">
                    {p.relationship} · {p.idNumber}
                  </span>
                </div>
              ))}
            </Card>
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeading title="Asistencia reciente" />
            <Card className="p-4">
              <AttendanceStrip records={[...s.attendance].reverse()} />
              <p className="mt-3 text-xs text-ink-2">
                Últimos {s.attendance.length} días con registro. Verde: presente · amarillo: tardía · rojo: ausente · gris: justificada.
              </p>
            </Card>
          </section>
          {statement && (
            <section>
              <SectionHeading
                title="Estado de cuenta"
                action={<span className={`tabular text-sm font-semibold ${statement.overdue > 0 ? "text-danger" : "text-ink-2"}`}>{statement.charged - statement.paid > 0 ? `Saldo ${crc(statement.charged - statement.paid)}` : "Al día"}</span>}
              />
              <Card className="divide-y divide-line">
                {statement.charges
                  .filter((c) => c.status !== "paid")
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{c.description}</p>
                        <p className="text-ink-2">Vence {dateLabel(c.date)}</p>
                      </div>
                      <Badge tone={c.status === "overdue" ? "danger" : "warn"}>{crc(c.amount - (c.paidAmount ?? 0))}</Badge>
                    </div>
                  ))}
                {[...statement.payments]
                  .reverse()
                  .slice(0, 4)
                  .map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{p.description}</p>
                        <p className="text-ink-2">
                          {dateLabel(p.date)} · {METHOD_LABEL[p.method!]}
                        </p>
                      </div>
                      <span className="tabular font-medium text-ok">{crc(p.amount)}</span>
                    </div>
                  ))}
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
