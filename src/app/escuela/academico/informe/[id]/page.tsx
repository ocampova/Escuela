import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { currentTerm } from "@/lib/academic";
import { gradeSectionName } from "@/lib/format";
import { Avatar, Card } from "@/components/ui";
import { HomeReportForm } from "./home-report-form";

export const metadata: Metadata = { title: "Informe al hogar" };

export default async function HomeReportPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ periodo?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireStaff();
  const student = await prisma.student.findFirst({
    where: { id, section: { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) } },
    include: { section: { include: { grade: { include: { level: true } } } } },
  });
  if (!student) notFound();
  const terms = await prisma.term.findMany({ where: { schoolYearId: student.section.schoolYearId }, orderBy: { order: "asc" } });
  const term = terms.find((t) => t.id === sp.periodo) ?? currentTerm(terms);
  if (!term) notFound();
  const [areas, notes, report, siblings] = await Promise.all([
    prisma.subject.findMany({ where: { levelId: student.section.grade.levelId, active: true }, orderBy: { order: "asc" } }),
    prisma.areaAssessment.findMany({ where: { studentId: id, termId: term.id } }),
    prisma.termReport.findUnique({ where: { studentId_termId: { studentId: id, termId: term.id } } }),
    prisma.student.findMany({ where: { sectionId: student.sectionId, status: "ACTIVE" }, select: { id: true }, orderBy: { firstName: "asc" } }),
  ]);
  const prevTerm = [...terms].reverse().find((t) => t.order < term.order);
  const [prevNotes, prevReport] = prevTerm
    ? await Promise.all([
        prisma.areaAssessment.findMany({ where: { studentId: id, termId: prevTerm.id } }),
        prisma.termReport.findUnique({ where: { studentId_termId: { studentId: id, termId: prevTerm.id } } }),
      ])
    : [[], null];
  const previous =
    prevTerm && (prevNotes.length || prevReport?.comment)
      ? {
          name: prevTerm.name,
          general: prevReport?.comment ?? "",
          areas: Object.fromEntries(prevNotes.map((n) => [n.subjectId, { achievement: n.achievement ?? "", comment: n.comment ?? "" }])),
        }
      : null;
  const idx = siblings.findIndex((s) => s.id === id);
  const next = siblings[idx + 1];
  const name = `${student.firstName} ${student.lastName}`;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href={`/escuela/academico?seccion=${student.sectionId}&periodo=${term.id}`} className="-ml-2 mb-3 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-canvas hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {gradeSectionName(student.section)}
      </Link>
      <div className="mb-5 flex items-center gap-3">
        <Avatar name={name} color={student.section.color} size={48} />
        <div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-ink-2">Informe al hogar · {term.name}</p>
        </div>
      </div>
      <Card className="p-5">
        <HomeReportForm
          key={`${id}-${term.id}`}
          studentId={id}
          termId={term.id}
          firstName={student.firstName}
          nextHref={next ? `/escuela/academico/informe/${next.id}?periodo=${term.id}` : null}
          general={report?.comment ?? ""}
          previous={previous}
          areas={areas.map((a) => {
            const n = notes.find((x) => x.subjectId === a.id);
            return { id: a.id, name: a.name, achievement: n?.achievement ?? "", comment: n?.comment ?? "" };
          })}
        />
      </Card>
    </div>
  );
}
