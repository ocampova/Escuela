import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { gradeSectionName } from "@/lib/format";
import { Card } from "@/components/ui";
import { AnnouncementForm } from "./announcement-form";

export const metadata: Metadata = { title: "Nuevo aviso" };

export default async function NewAnnouncement() {
  const user = await requireStaff();
  const sections = await staffSections(user);
  const levels = isManager(user) ? await prisma.level.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }) : [];
  const targets = [
    ...(isManager(user) ? [{ value: "school", label: "Toda la escuela", group: "Escuela" }] : []),
    ...levels.map((l) => ({ value: `level:${l.id}`, label: `Todo ${l.name}`, group: "Nivel" })),
    ...sections.map((s) => ({ value: `section:${s.id}`, label: gradeSectionName(s), group: "Sección" })),
  ];
  return (
    <div className="max-w-2xl">
      <Link href="/escuela/avisos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Avisos
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Nuevo aviso</h1>
      <Card className="p-5 sm:p-6">
        <AnnouncementForm targets={targets} />
      </Card>
    </div>
  );
}
