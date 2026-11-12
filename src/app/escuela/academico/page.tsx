import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, ChevronRight, Eye, FileText, Printer } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { currentTerm } from "@/lib/academic";
import { dateLabel, gradeSectionName } from "@/lib/format";
import { Avatar, Badge, Button, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { SectionPicker } from "@/components/section-picker";
import { AcademicoTabs } from "../academico-tabs";
import { setPublished } from "../academico-actions";
import { ScoresForm } from "./scores-form";
import { ADAPTATION_SHORT } from "@/lib/student";
import { ObservationsForm } from "./observations-form";

export const metadata: Metadata = { title: "Notas e informes" };

const chip = (on: boolean) =>
  cx("inline-flex h-8 items-center rounded-full px-3 text-sm font-medium ring-1 ring-inset transition-colors", on ? "bg-ink text-white ring-ink" : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas");

export default async function AcademicPage({ searchParams }: { searchParams: Promise<{ seccion?: string; periodo?: string; materia?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const section = sections.find((s) => s.id === sp.seccion) ?? sections[0];

  if (!section)
    return (
      <div>
        <PageHeader title="Académico" />
        <Card>
          <EmptyState title="No tiene secciones asignadas">Dirección le asigna sus secciones en Configuración.</EmptyState>
        </Card>
      </div>
    );

  const level = section.grade.level;
  const descriptive = level.evaluation === "DESCRIPTIVE";
  const [terms, subjects, components, students] = await Promise.all([
    prisma.term.findMany({ where: { schoolYearId: section.schoolYearId }, orderBy: { order: "asc" } }),
    prisma.subject.findMany({ where: { levelId: level.id, active: true }, orderBy: { order: "asc" } }),
    prisma.gradeComponent.findMany({ where: { levelId: level.id }, orderBy: { order: "asc" } }),
    prisma.student.findMany({ where: { sectionId: section.id, status: "ACTIVE" }, orderBy: { firstName: "asc" } }),
  ]);
  const term = terms.find((t) => t.id === sp.periodo) ?? currentTerm(terms);
  const subject = subjects.find((s) => s.id === sp.materia) ?? (sp.materia === "obs" ? null : subjects[0]);
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ seccion: section.id, ...(term ? { periodo: term.id } : {}), ...(subject ? { materia: subject.id } : {}), ...o } as Record<string, string>);
    return `/escuela/academico?${p}`;
  };

  const publication = term ? await prisma.termPublication.findUnique({ where: { termId_sectionId: { termId: term.id, sectionId: section.id } } }) : null;

  return (
    <div>
      <PageHeader title="Académico" description={descriptive ? "Informe al hogar por ámbitos, como pide el programa de preescolar." : "Notas de 0 a 100 por componente; la nota del periodo se calcula sola."} />
      <AcademicoTabs active="/escuela/academico" />
      <div className="mb-4">
        <SectionPicker sections={sections} current={section.id} href={(id) => `/escuela/academico?seccion=${id}`} />
      </div>

      {!term ? (
        <Card>
          <EmptyState title="No hay periodos configurados">Dirección los agrega en Configuración › Académico.</EmptyState>
        </Card>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {terms.map((t) => (
              <Link key={t.id} href={`/escuela/academico?seccion=${section.id}&periodo=${t.id}`} aria-current={t.id === term.id ? "page" : undefined} className={chip(t.id === term.id)}>
                {t.name}
              </Link>
            ))}
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Link href={`/boletas/seccion/${section.id}/${term.id}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-brand hover:bg-canvas">
                <Printer className="size-4" aria-hidden /> {descriptive ? "Imprimir todos" : "Imprimir todas"}
              </Link>
              {publication ? (
                <>
                  <Badge tone="ok">
                    <CheckCircle2 className="size-3.5" aria-hidden /> Publicado el {dateLabel(new Date(publication.publishedAt.getTime() - 6 * 3600_000), { day: "numeric", month: "short" })}
                  </Badge>
                  <form action={setPublished.bind(null, section.id, term.id, false)}>
                    <Button variant="ghost" size="sm">Ocultar a las familias</Button>
                  </form>
                </>
              ) : (
                <>
                  <span className="text-sm text-ink-2">Las familias todavía no lo ven</span>
                  <form action={setPublished.bind(null, section.id, term.id, true)}>
                    <Button size="sm">{descriptive ? "Publicar informes" : "Publicar boletas"}</Button>
                  </form>
                </>
              )}
            </div>
          </div>

          {descriptive ? (
            <DescriptiveList sectionColor={section.color} students={students} termId={term.id} areas={subjects.length} />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap gap-1.5" role="list" aria-label="Materias">
                {subjects.map((s) => (
                  <Link key={s.id} role="listitem" href={q({ materia: s.id })} aria-current={s.id === subject?.id ? "page" : undefined} className={chip(s.id === subject?.id)}>
                    {s.name}
                  </Link>
                ))}
                <Link role="listitem" href={q({ materia: "obs" })} aria-current={!subject ? "page" : undefined} className={chip(!subject)}>
                  Observaciones
                </Link>
              </div>
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
                  <div>
                    <h2 className="font-semibold">
                      {subject ? subject.name : "Observaciones del periodo"} · {gradeSectionName(section)}
                    </h2>
                    <p className="text-sm text-ink-2">
                      {term.name}
                      {subject && components.length > 0 && ` · ${components.map((c) => `${c.name} ${c.weight}%`).join(" · ")}`}
                    </p>
                  </div>
                </div>
                {subject ? (
                  <ScoresKey sectionId={section.id} termId={term.id} subjectId={subject.id} students={students} components={components} color={section.color} />
                ) : (
                  <ObsKey sectionId={section.id} termId={term.id} students={students} color={section.color} />
                )}
              </Card>
              <p className="mt-3 text-xs text-ink-3">Componentes y porcentajes según el Reglamento de Evaluación vigente; Dirección los ajusta en Configuración › Académico.</p>
            </>
          )}
        </>
      )}
    </div>
  );
}

async function ScoresKey({ sectionId, termId, subjectId, students, components, color }: { sectionId: string; termId: string; subjectId: string; students: { id: string; firstName: string; lastName: string; adaptation: string }[]; components: { id: string; name: string; weight: number }[]; color: string }) {
  const scores = await prisma.score.findMany({ where: { termId, subjectId, studentId: { in: students.map((s) => s.id) } } });
  return (
    <ScoresForm
      key={`${termId}-${subjectId}`}
      sectionId={sectionId}
      termId={termId}
      subjectId={subjectId}
      components={components.map((c) => ({ id: c.id, name: c.name, weight: c.weight }))}
      rows={students.map((s) => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        color,
        support: ADAPTATION_SHORT[s.adaptation] ?? null,
        values: Object.fromEntries(components.map((c) => [c.id, scores.find((x) => x.studentId === s.id && x.componentId === c.id)?.value.toString() ?? ""])),
      }))}
    />
  );
}

async function ObsKey({ sectionId, termId, students, color }: { sectionId: string; termId: string; students: { id: string; firstName: string; lastName: string }[]; color: string }) {
  const reports = await prisma.termReport.findMany({ where: { termId, studentId: { in: students.map((s) => s.id) } } });
  return (
    <ObservationsForm
      key={termId}
      sectionId={sectionId}
      termId={termId}
      rows={students.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, color, comment: reports.find((r) => r.studentId === s.id)?.comment ?? "" }))}
    />
  );
}

async function DescriptiveList({ students, termId, areas, sectionColor }: { students: { id: string; firstName: string; lastName: string }[]; termId: string; areas: number; sectionColor: string }) {
  const notes = await prisma.areaAssessment.findMany({ where: { termId, studentId: { in: students.map((s) => s.id) }, achievement: { not: null } }, select: { studentId: true } });
  return (
    <Card className="divide-y divide-line">
      {students.map((s) => {
        const done = notes.filter((n) => n.studentId === s.id).length;
        return (
          <div key={s.id} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={`${s.firstName} ${s.lastName}`} color={sectionColor} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {s.firstName} {s.lastName}
              </p>
              <p className={cx("text-sm", done === areas && areas > 0 ? "text-ok" : "text-ink-2")}>
                {done === areas && areas > 0 ? "Informe completo" : `${done} de ${areas} ámbitos`}
              </p>
            </div>
            <Link href={`/boletas/${s.id}/${termId}`} className="hidden h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-ink-2 hover:bg-canvas sm:inline-flex" aria-label={`Vista previa del informe de ${s.firstName}`}>
              <Eye className="size-4" aria-hidden /> Vista previa
            </Link>
            <Link href={`/escuela/academico/informe/${s.id}?periodo=${termId}`} className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium text-brand ring-1 ring-inset ring-line-strong hover:bg-canvas">
              <FileText className="size-4" aria-hidden /> {done ? "Editar" : "Escribir"}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        );
      })}
    </Card>
  );
}
