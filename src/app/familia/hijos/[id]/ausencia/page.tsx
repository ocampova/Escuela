import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { todayKey } from "@/lib/format";
import { Card } from "@/components/ui";
import { AbsenceForm } from "./absence-form";

export const metadata: Metadata = { title: "Avisar ausencia" };

export default async function AbsencePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireGuardian();
  const s = await prisma.student.findFirst({ where: { id, guardians: { some: { userId: user.id } } }, include: { section: { include: { teacher: { select: { name: true } } } } } });
  if (!s) notFound();
  const min = new Date(Date.now() - 7 * 86400_000 - 6 * 3600_000).toISOString().slice(0, 10);
  return (
    <div className="mx-auto max-w-xl">
      <Link href={`/familia/hijos/${s.id}`} className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {s.firstName}
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Avisar ausencia de {s.firstName}</h1>
      <p className="mt-1 mb-6 text-sm text-ink-2">
        {s.section.teacher ? `${s.section.teacher.name.split(" ").slice(0, 2).join(" ")} recibirá el aviso al instante.` : "La escuela recibirá el aviso."} Si la ausencia ya pasó, queda justificada.
      </p>
      <Card className="p-5">
        <AbsenceForm studentId={s.id} today={todayKey()} minDate={min} />
      </Card>
    </div>
  );
}
