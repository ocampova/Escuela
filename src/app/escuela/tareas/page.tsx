import type { Metadata } from "next";
import { ClipboardList, Trash2 } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { capitalize, dateLabel, gradeSectionName, keyToDate, todayKey } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, EmptyState, Field, PageHeader, SectionChip, SectionHeading, inputClass } from "@/components/ui";
import { SectionPicker } from "@/components/section-picker";
import { AcademicoTabs } from "../academico-tabs";
import { createHomework, deleteHomework } from "../academico-actions";

export const metadata: Metadata = { title: "Tareas" };

export default async function HomeworkPage({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const section = sections.find((s) => s.id === sp.seccion) ?? sections[0];
  const today = keyToDate(todayKey());
  const [list, subjects] = section
    ? await Promise.all([
        prisma.homework.findMany({ where: { sectionId: section.id, dueDate: { gte: new Date(today.getTime() - 14 * 86_400_000) } }, include: { subject: true }, orderBy: { dueDate: "asc" } }),
        prisma.subject.findMany({ where: { levelId: section.grade.levelId, active: true }, orderBy: { order: "asc" } }),
      ])
    : [[], []];
  const upcoming = list.filter((h) => h.dueDate >= today);
  const past = list.filter((h) => h.dueDate < today).reverse();

  return (
    <div>
      <PageHeader title="Académico" description="Tareas para la casa: las familias las ven en la app y reciben una notificación." />
      <AcademicoTabs active="/escuela/tareas" />
      <div className="mb-5">
        <SectionPicker sections={sections} current={section?.id} href={(id) => `/escuela/tareas?seccion=${id}`} />
      </div>
      {section && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <section>
              <SectionHeading title="Próximas entregas" />
              {upcoming.length === 0 ? (
                <Card>
                  <EmptyState icon={<ClipboardList className="size-5" />} title="Sin tareas pendientes">Las tareas que publique aparecerán aquí y en la app de las familias.</EmptyState>
                </Card>
              ) : (
                <Card className="divide-y divide-line">
                  {upcoming.map((h) => <Row key={h.id} h={h} />)}
                </Card>
              )}
            </section>
            {past.length > 0 && (
              <section>
                <SectionHeading title="Entregadas (últimas 2 semanas)" />
                <Card tone="flat" className="divide-y divide-line opacity-80">
                  {past.map((h) => <Row key={h.id} h={h} />)}
                </Card>
              </section>
            )}
          </div>
          <aside>
            <Card className="p-5 lg:sticky lg:top-8">
              <h2 className="mb-1 font-semibold">Nueva tarea</h2>
              <p className="mb-4 text-sm text-ink-2">
                Para <SectionChip color={section.color} label={gradeSectionName(section)} />
              </p>
              <ActionForm action={createHomework} submitLabel="Publicar tarea" pendingLabel="Publicando…">
                <input type="hidden" name="sectionId" value={section.id} />
                {subjects.length > 0 && (
                  <Field label="Materia" htmlFor="subjectId">
                    <select id="subjectId" name="subjectId" className={inputClass}>
                      <option value="">General</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </Field>
                )}
                <Field label="Qué deben hacer" htmlFor="title">
                  <input id="title" name="title" required maxLength={140} placeholder="Ej.: Página 34 del libro de Matemáticas" className={inputClass} />
                </Field>
                <Field label="Detalles" htmlFor="description" hint="Opcional: materiales, instrucciones.">
                  <textarea id="description" name="description" rows={3} maxLength={2000} className={inputClass} />
                </Field>
                <Field label="Para el" htmlFor="dueDate">
                  <input id="dueDate" type="date" name="dueDate" required min={todayKey()} className={inputClass} />
                </Field>
              </ActionForm>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function Row({ h }: { h: { id: string; title: string; description: string | null; dueDate: Date; subject: { name: string } | null } }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{h.title}</p>
        {h.description && <p className="mt-0.5 text-sm text-ink-2">{h.description}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
          <span>{capitalize(dateLabel(h.dueDate, { weekday: "long", day: "numeric", month: "short" }))}</span>
          {h.subject && <Badge>{h.subject.name}</Badge>}
        </div>
      </div>
      <form action={deleteHomework.bind(null, h.id)}>
        <button aria-label={`Eliminar tarea ${h.title}`} className="grid size-9 place-items-center rounded-lg text-ink-3 hover:bg-danger-soft hover:text-danger">
          <Trash2 className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}
