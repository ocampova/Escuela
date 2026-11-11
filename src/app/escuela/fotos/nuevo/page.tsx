import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { gradeSectionName, todayKey } from "@/lib/format";
import { Card, PageHeader } from "@/components/ui";
import { AlbumForm } from "./album-form";

export const metadata: Metadata = { title: "Subir fotos" };

export default async function NewAlbumPage({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const students = await prisma.student.findMany({
    where: { sectionId: { in: sections.map((s) => s.id) }, photoConsent: { not: true } },
    select: { firstName: true, lastName: true, sectionId: true, photoConsent: true },
    orderBy: { firstName: "asc" },
  });
  const noConsent: Record<string, { name: string; answered: boolean }[]> = {};
  for (const s of students) (noConsent[s.sectionId] ??= []).push({ name: `${s.firstName} ${s.lastName}`, answered: s.photoConsent === false });

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Subir fotos" description="Las fotos se achican en su celular antes de subirse, para que carguen rápido." />
      <Card className="p-5">
        <AlbumForm
          sections={sections.map((s) => ({ id: s.id, label: gradeSectionName(s) }))}
          defaultSection={sections.find((s) => s.id === sp.seccion)?.id ?? sections[0]?.id}
          today={todayKey()}
          noConsent={noConsent}
        />
      </Card>
    </div>
  );
}
