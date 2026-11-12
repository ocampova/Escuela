import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PrintButton } from "@/components/print-button";
import { PrintSheet } from "@/components/print-sheet";
import { buttonClass } from "@/components/ui";
import { BoletaBody } from "../../boleta";

export const metadata: Metadata = { title: "Boleta" };

export default async function BoletaPage({ params }: { params: Promise<{ id: string; term: string }> }) {
  const { id, term: termId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/boletas/${id}/${termId}`);
  const student = await prisma.student.findFirst({
    where: {
      id,
      section: { schoolYear: { schoolId: user.schoolId }, ...(user.role === "TEACHER" ? { teacherId: user.id } : {}) },
      ...(user.role === "GUARDIAN" ? { guardians: { some: { userId: user.id } } } : {}),
    },
    include: { section: { include: { grade: { include: { level: true } }, teacher: { select: { name: true } }, schoolYear: true } } },
  });
  if (!student || (user.role !== "GUARDIAN" && user.role !== "TEACHER" && !isManager(user))) notFound();
  const term = await prisma.term.findFirst({ where: { id: termId, schoolYearId: student.section.schoolYearId } });
  if (!term) notFound();
  const published = await prisma.termPublication.findUnique({ where: { termId_sectionId: { termId, sectionId: student.sectionId } } });
  if (user.role === "GUARDIAN" && !published) notFound();

  const descriptive = student.section.grade.level.evaluation === "DESCRIPTIVE";
  const back = user.role === "GUARDIAN" ? `/familia/hijos/${id}` : `/escuela/academico?seccion=${student.sectionId}&periodo=${termId}`;

  return (
    <PrintSheet
      school={user.school}
      title={descriptive ? "Informe al hogar" : "Boleta de calificaciones"}
      subtitle={`${term.name} · ${student.section.schoolYear.name}`}
      actions={
        <>
          <Link href={back} className={buttonClass("ghost")}>
            <ArrowLeft className="size-4" aria-hidden /> Volver
          </Link>
          {!published && <span className="text-sm text-warn">Vista previa: las familias todavía no la ven.</span>}
          <PrintButton />
        </>
      }
    >
      <BoletaBody student={student} term={term} />
    </PrintSheet>
  );
}
