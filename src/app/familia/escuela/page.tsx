import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents } from "@/lib/queries";
import { money } from "@/lib/format";
import { BankInfo } from "@/components/bank-info";
import { Card, SectionHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Información de la escuela" };

export default async function SchoolInfo() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const levelIds = [...new Set(students.map((s) => s.section.grade.levelId))];
  const [school, levels] = await Promise.all([
    prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } }),
    prisma.level.findMany({
      where: { id: { in: levelIds } },
      orderBy: { order: "asc" },
      include: { feeConcepts: { orderBy: [{ recurring: "desc" }, { name: "asc" }] } },
    }),
  ]);
  const general = await prisma.feeConcept.findMany({ where: { schoolId: user.schoolId, levelId: null } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Información</h1>
        <p className="mt-1 text-sm text-ink-2">Horarios, contacto, precios y materiales de {school.name}.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      {levels.map((l) => {
        const phones = (l.phone ?? "").split("/").map((p) => p.trim()).filter(Boolean);
        const prices = [...general, ...l.feeConcepts];
        return (
          <section key={l.id} className="space-y-3">
            <SectionHeading title={l.name} />
            <Card className="divide-y divide-line">
              {l.schedule && (
                <div className="flex gap-3 px-4 py-3">
                  <Clock className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <p className="text-sm whitespace-pre-line">{l.schedule}</p>
                </div>
              )}
              {phones.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                  <Phone className="size-4 shrink-0 text-brand" aria-hidden />
                  {phones.map((p) => (
                    <a key={p} href={`tel:${p.replace(/\D/g, "")}`} className="tap tabular text-sm font-medium text-brand hover:underline">
                      {p}
                    </a>
                  ))}
                </div>
              )}
              {l.address && (
                <div className="flex gap-3 px-4 py-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                  <a href={`https://maps.google.com/?q=${encodeURIComponent(l.address)}`} target="_blank" rel="noreferrer" className="tap text-sm hover:underline">
                    {l.address}
                  </a>
                </div>
              )}
            </Card>

            {prices.length > 0 && (
              <Card>
                <p className="border-b border-line px-4 py-3 text-sm font-medium">Precios {l.name.toLowerCase()}</p>
                <dl className="divide-y divide-line">
                  {prices.map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                      <dt>
                        {c.name}
                        {(c.earlyAmount || c.dueNote) && (
                          <span className="block text-xs text-ink-2">
                            {c.earlyAmount ? `${money(c.earlyAmount, c.currency)} en agosto y setiembre. ` : ""}
                            {c.dueNote && !c.earlyAmount ? c.dueNote : ""}
                          </span>
                        )}
                      </dt>
                      <dd className="tabular shrink-0 font-semibold">
                        {money(c.defaultAmount, c.currency)}
                        {c.recurring ? <span className="font-normal text-ink-2"> / mes</span> : ""}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>
            )}

            {l.materials && (
              <details className="rounded-xl bg-surface shadow-card">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-brand">Lista de materiales de {l.name.toLowerCase()}</summary>
                <ul className="list-disc space-y-1 border-t border-line py-3 pr-4 pl-9 text-sm">
                  {l.materials
                    .split("\n")
                    .filter(Boolean)
                    .map((m, i) => (
                      <li key={i}>{m}</li>
                    ))}
                </ul>
              </details>
            )}
          </section>
        );
      })}
      </div>

      <section className="lg:max-w-xl">
        <SectionHeading title="Pagos" />
        <Card className="p-4">
          <BankInfo bank={school} />
        </Card>
      </section>

      {school.email && (
        <a href={`mailto:${school.email}`} className="tap flex items-center justify-center gap-2 text-sm font-medium text-brand hover:underline">
          <Mail className="size-4" aria-hidden /> {school.email}
        </a>
      )}
    </div>
  );
}
