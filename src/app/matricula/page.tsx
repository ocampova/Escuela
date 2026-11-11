import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/public-shell";
import { ApplyForm } from "./apply-form";
import { money } from "@/lib/format";

export const metadata: Metadata = {
  title: "Matrícula en línea",
  description: "Solicite la matrícula en San Cayetano School, Grecia.",
};
export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const levels = await prisma.level.findMany({ orderBy: { order: "asc" }, include: { grades: { orderBy: { order: "asc" } }, feeConcepts: { where: { recurring: true } } } });
  const enrollment = await prisma.feeConcept.findFirst({ where: { name: { equals: "Matrícula", mode: "insensitive" }, levelId: null } });
  const grades = levels.flatMap((l) => l.grades.map((g) => ({ id: g.id, label: `${g.name} (${l.name})` })));
  return (
    <PublicShell title={`Matrícula ${year}`} subtitle="Complete la solicitud y Secretaría le contactará para coordinar una visita y los siguientes pasos.">
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        {levels.map((l) => (
          <div key={l.id} className="rounded-xl bg-canvas p-4 text-sm">
            <p className="font-semibold">{l.name}</p>
            <p className="mt-0.5 text-ink-2">{l.grades.map((g) => g.name).join(", ")}</p>
            {l.schedule && <p className="mt-2 whitespace-pre-line text-ink-2">{l.schedule}</p>}
            {l.feeConcepts[0] && (
              <p className="tabular mt-2 font-medium">
                Mensualidad {money(l.feeConcepts[0].defaultAmount, l.feeConcepts[0].currency)}
              </p>
            )}
          </div>
        ))}
        {enrollment && (
          <p className="text-sm text-ink-2 sm:col-span-2">
            Matrícula anual <span className="tabular font-medium text-ink">{money(enrollment.defaultAmount, enrollment.currency)}</span>
            {enrollment.earlyAmount && (
              <>
                , o <span className="tabular font-medium text-ink">{money(enrollment.earlyAmount, enrollment.currency)}</span> si se formaliza en agosto o setiembre
              </>
            )}
            .
          </p>
        )}
      </div>
      <ApplyForm grades={grades} />
    </PublicShell>
  );
}
