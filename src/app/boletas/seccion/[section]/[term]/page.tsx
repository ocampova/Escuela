import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { gradeSectionName } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { SheetArticle } from "@/components/print-sheet";
import { buttonClass } from "@/components/ui";
import { BoletaBody, boletaTitle } from "../../../boleta";

export const metadata: Metadata = { title: "Boletas de la sección" };

/** Todas las boletas o informes de una sección en un solo documento: se imprime o guarda como un PDF. */
export default async function SectionBoletas({ params }: { params: Promise<{ section: string; term: string }> }) {
  const { section: sectionId, term: termId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/boletas/seccion/${sectionId}/${termId}`);
  if (user.role === "GUARDIAN") notFound();
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) },
    include: { grade: { include: { level: true } }, teacher: { select: { name: true } }, schoolYear: true },
  });
  if (!section) notFound();
  const term = await prisma.term.findFirst({ where: { id: termId, schoolYearId: section.schoolYearId } });
  if (!term) notFound();
  const students = await prisma.student.findMany({ where: { sectionId, status: "ACTIVE" }, orderBy: [{ lastName: "asc" }, { firstName: "asc" }] });
  const title = boletaTitle(section.grade.level.evaluation);

  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/escuela/academico?seccion=${sectionId}&periodo=${termId}`} className={buttonClass("ghost")}>
          <ArrowLeft className="size-4" aria-hidden /> Volver
        </Link>
        <span className="text-sm text-ink-2">
          {students.length} {students.length === 1 ? "alumno" : "alumnos"} · {gradeSectionName(section)} · {term.name}
        </span>
        <PrintButton label="Imprimir todas o guardar como PDF" />
      </div>
      <div className="space-y-6 print:space-y-0">
        {students.map((s) => (
          <SheetArticle key={s.id} school={user.school} title={`${title} · ${s.firstName} ${s.lastName}`} subtitle={`${term.name} · ${section.schoolYear.name}`} className="break-after-page">
            <BoletaBody student={{ ...s, section }} term={term} />
          </SheetArticle>
        ))}
      </div>
    </main>
  );
}
