import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/public-shell";
import { ApplyForm } from "./apply-form";

export const metadata: Metadata = {
  title: "Matrícula en línea",
  description: "Solicite la matrícula en San Cayetano School, Grecia.",
};
export const dynamic = "force-dynamic";

export default async function ApplyPage() {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  const levels = await prisma.level.findMany({ orderBy: { order: "asc" }, include: { grades: { orderBy: { order: "asc" } } } });
  const grades = levels.flatMap((l) => l.grades.map((g) => ({ id: g.id, label: `${g.name} (${l.name})` })));
  return (
    <PublicShell title={`Matrícula ${year}`} subtitle="Complete la solicitud y Secretaría le contactará para coordinar una visita y los siguientes pasos.">
      <ApplyForm grades={grades} />
    </PublicShell>
  );
}
