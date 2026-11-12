import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { PASSING, achievementLabel, termGrade } from "@/lib/academic";
import { dateLabel, gradeSectionName } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { PrintSheet } from "@/components/print-sheet";
import { buttonClass, cx } from "@/components/ui";

export const metadata: Metadata = { title: "Boleta" };

const ACH_CLASS: Record<string, string> = { ok: "bg-ok-soft text-ok", brand: "bg-brand-soft text-brand-ink", warn: "bg-warn-soft text-warn" };

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

  const level = student.section.grade.level;
  const descriptive = level.evaluation === "DESCRIPTIVE";
  const [subjects, components, scores, notes, report, attendance] = await Promise.all([
    prisma.subject.findMany({ where: { levelId: level.id, active: true }, orderBy: { order: "asc" } }),
    prisma.gradeComponent.findMany({ where: { levelId: level.id }, orderBy: { order: "asc" } }),
    prisma.score.findMany({ where: { studentId: id, termId } }),
    prisma.areaAssessment.findMany({ where: { studentId: id, termId } }),
    prisma.termReport.findUnique({ where: { studentId_termId: { studentId: id, termId } } }),
    prisma.attendance.groupBy({ by: ["status"], where: { studentId: id, date: { gte: term.startsOn, lte: term.endsOn } }, _count: true }),
  ]);
  const att = (s: string) => attendance.find((a) => a.status === s)?._count ?? 0;
  const back = user.role === "GUARDIAN" ? `/familia/hijos/${id}` : `/escuela/academico?seccion=${student.sectionId}&periodo=${termId}`;
  const grades = subjects.map((s) => {
    const mine = scores.filter((x) => x.subjectId === s.id);
    return { s, g: termGrade(components, mine), complete: components.every((c) => mine.some((x) => x.componentId === c.id)) };
  });
  const partial = grades.some((x) => x.g !== null && !x.complete);
  const graded = grades.filter((x) => x.g !== null);
  const average = graded.length ? Math.round(graded.reduce((a, x) => a + x.g!, 0) / graded.length) : null;

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
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg bg-canvas px-4 py-3 text-sm print:bg-white print:ring-1 print:ring-line">
        <div>
          <dt className="text-ink-2">Estudiante</dt>
          <dd className="font-medium">{student.firstName} {student.lastName}</dd>
        </div>
        <div>
          <dt className="text-ink-2">Sección</dt>
          <dd className="font-medium">{gradeSectionName(student.section)}</dd>
        </div>
        <div>
          <dt className="text-ink-2">Docente</dt>
          <dd className="font-medium">{student.section.teacher?.name ?? "Sin asignar"}</dd>
        </div>
        <div>
          <dt className="text-ink-2">Periodo</dt>
          <dd className="font-medium">
            {dateLabel(term.startsOn, { day: "numeric", month: "short" })} al {dateLabel(term.endsOn, { day: "numeric", month: "short", year: "numeric" })}
          </dd>
        </div>
      </dl>

      {descriptive ? (
        <div className="mt-6 space-y-4">
          {subjects.map((s) => {
            const n = notes.find((x) => x.subjectId === s.id);
            const a = achievementLabel(n?.achievement);
            return (
              <section key={s.id} className="break-inside-avoid rounded-lg px-4 py-3 ring-1 ring-line">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold">{s.name}</h2>
                  {a && <span className={cx("rounded-full px-2.5 py-0.5 text-xs font-semibold", ACH_CLASS[a.tone])}>{a.label}</span>}
                </div>
                {n?.comment ? <p className="mt-1.5 text-sm whitespace-pre-line text-ink-2">{n.comment}</p> : <p className="mt-1.5 text-sm text-ink-3">Sin comentario.</p>}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line-strong text-left text-xs text-ink-2">
                <th scope="col" className="py-2 pr-3 font-medium">Materia</th>
                {components.map((c) => (
                  <th key={c.id} scope="col" className="hidden px-2 py-2 text-center font-medium sm:table-cell print:table-cell">
                    {c.name} <span className="text-ink-3">{c.weight}%</span>
                  </th>
                ))}
                <th scope="col" className="py-2 pl-3 text-right font-medium">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {grades.map(({ s, g, complete }) => (
                <tr key={s.id}>
                  <th scope="row" className="py-2 pr-3 text-left font-medium">{s.name}</th>
                  {components.map((c) => (
                    <td key={c.id} className="tabular hidden px-2 py-2 text-center text-ink-2 sm:table-cell print:table-cell">
                      {scores.find((x) => x.subjectId === s.id && x.componentId === c.id)?.value ?? "—"}
                    </td>
                  ))}
                  <td className={cx("tabular py-2 pl-3 text-right font-semibold", g !== null && complete && g < PASSING && "text-danger", !complete && "text-ink-2")}>
                    {g ?? "—"}
                    {g !== null && !complete && "*"}
                  </td>
                </tr>
              ))}
            </tbody>
            {average !== null && (
              <tfoot>
                <tr className="border-t border-line-strong">
                  <th scope="row" className="py-2.5 pr-3 text-left font-semibold">Promedio del periodo{partial ? "*" : ""}</th>
                  {components.map((c) => (
                    <td key={c.id} className="hidden sm:table-cell print:table-cell" />
                  ))}
                  <td className="tabular py-2.5 pl-3 text-right text-base font-semibold">{average}</td>
                </tr>
              </tfoot>
            )}
          </table>
          <p className="mt-2 text-xs text-ink-3">
            Nota mínima de aprobación: {PASSING}.{partial ? " * Nota acumulada: el periodo todavía tiene evaluaciones pendientes." : ""}
            <span className="sm:hidden print:hidden"> El detalle por componente se ve en una pantalla más ancha o al imprimir.</span>
          </p>
        </div>
      )}

      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
        {[
          ["Ausencias", att("ABSENT")],
          ["Justificadas", att("EXCUSED")],
          ["Tardías", att("LATE")],
        ].map(([k, v]) => (
          <div key={k as string} className="rounded-lg bg-canvas py-2 print:ring-1 print:ring-line">
            <p className="text-xs text-ink-2">{k}</p>
            <p className="tabular text-lg font-semibold">{v}</p>
          </div>
        ))}
      </div>

      {report?.comment && (
        <section className="mt-6 break-inside-avoid">
          <h2 className="font-semibold">{descriptive ? "Mensaje para la familia" : "Observaciones"}</h2>
          <p className="mt-1.5 text-sm whitespace-pre-line text-ink-2">{report.comment}</p>
        </section>
      )}

      <div className="mt-12 hidden grid-cols-2 gap-10 text-center text-xs text-ink-2 print:grid">
        <p className="border-t border-ink pt-2">Docente</p>
        <p className="border-t border-ink pt-2">Dirección</p>
      </div>
    </PrintSheet>
  );
}
