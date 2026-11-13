import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { dateLabel } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Badge, Card, Field, SectionHeading, inputClass } from "@/components/ui";
import { addSubject, addTerm, deleteTerm, saveLevelEvaluation, toggleSubject } from "../academico-actions";

/** Periodos, materias o ámbitos y componentes de la nota por nivel. */
export async function AcademicSettings({ schoolId, yearId }: { schoolId: string; yearId: string | null }) {
  const [terms, levels] = await Promise.all([
    yearId ? prisma.term.findMany({ where: { schoolYearId: yearId }, orderBy: { order: "asc" }, include: { _count: { select: { scores: true, areaNotes: true } } } }) : [],
    prisma.level.findMany({ where: { schoolId }, orderBy: { order: "asc" }, include: { subjects: { orderBy: { order: "asc" } }, components: { orderBy: { order: "asc" } } } }),
  ]);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-8">
        {levels.map((l) => {
          const descriptive = l.evaluation === "DESCRIPTIVE";
          const rows = [...l.components, ...Array.from({ length: Math.max(0, 6 - l.components.length) }, () => null)];
          return (
            <section key={l.id}>
              <SectionHeading title={l.name} />
              <Card className="space-y-5 p-5">
                <ActionForm action={saveLevelEvaluation} submitLabel="Guardar evaluación" resetOnOk={false}>
                  <input type="hidden" name="levelId" value={l.id} />
                  <Field label="Tipo de evaluación" htmlFor={`ev-${l.id}`}>
                    <select id={`ev-${l.id}`} name="evaluation" defaultValue={l.evaluation} className={inputClass}>
                      <option value="NUMERIC">Notas de 0 a 100 por componentes (primaria)</option>
                      <option value="DESCRIPTIVE">Informe al hogar descriptivo (preescolar)</option>
                    </select>
                  </Field>
                  {!descriptive && (
                    <fieldset>
                      <legend className="mb-1.5 text-sm font-medium">Componentes de la nota (deben sumar 100%)</legend>
                      <div className="space-y-2">
                        {rows.map((c, i) => (
                          <div key={c?.id ?? `new-${i}`} className="grid grid-cols-[minmax(0,1fr)_88px] gap-2">
                            {c && <input type="hidden" name={`cid-${i}`} value={c.id} />}
                            <input name={`cname-${i}`} defaultValue={c?.name} placeholder="Componente" aria-label={`Componente ${i + 1}`} className={inputClass} />
                            <input name={`cweight-${i}`} defaultValue={c?.weight} inputMode="decimal" placeholder="%" aria-label={`Porcentaje ${i + 1}`} className={inputClass} />
                          </div>
                        ))}
                      </div>
                      <p className="mt-1.5 text-xs text-ink-3">Ajústelos al Reglamento de Evaluación de los Aprendizajes vigente para cada ciclo.</p>
                    </fieldset>
                  )}
                </ActionForm>
                <div className="border-t border-line pt-4">
                  <p className="mb-2 text-sm font-medium">{descriptive ? "Ámbitos del informe" : "Materias"}</p>
                  <ul className="mb-3 flex flex-wrap gap-1.5">
                    {l.subjects.map((s) => (
                      <li key={s.id}>
                        <form action={toggleSubject.bind(null, s.id, !s.active)}>
                          <button title={s.active ? "Ocultar" : "Volver a mostrar"} className="rounded-full">
                            <Badge tone={s.active ? "brand" : "neutral"} className={s.active ? "" : "line-through opacity-60"}>{s.name}</Badge>
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                  <ActionForm action={addSubject} submitLabel="Agregar" inline variant="secondary">
                    <input type="hidden" name="levelId" value={l.id} />
                    <div className="min-w-0 flex-1">
                      <input name="name" required placeholder={descriptive ? "Nuevo ámbito" : "Nueva materia"} aria-label="Nombre" className={inputClass} />
                    </div>
                  </ActionForm>
                  <p className="mt-2 text-xs text-ink-3">Toque una materia para ocultarla o volver a mostrarla.</p>
                </div>
              </Card>
            </section>
          );
        })}
      </div>
      <aside>
        <Card className="p-5 xl:sticky xl:top-8">
          <h2 className="mb-1 font-semibold">Periodos del curso</h2>
          <p className="mb-4 text-sm text-ink-2">Trimestres o semestres, según defina la escuela.</p>
          <ul className="mb-4 divide-y divide-line rounded-lg ring-1 ring-line">
            {terms.length === 0 && <li className="px-3 py-2.5 text-sm text-ink-2">Sin periodos.</li>}
            {terms.map((t) => (
              <li key={t.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-ink-2">
                    {dateLabel(t.startsOn, { day: "numeric", month: "short" })} al {dateLabel(t.endsOn, { day: "numeric", month: "short" })}
                  </p>
                </div>
                {t._count.scores + t._count.areaNotes === 0 && (
                  <form action={deleteTerm.bind(null, t.id)}>
                    <button aria-label={`Eliminar ${t.name}`} className="grid size-8 place-items-center rounded-lg text-ink-3 hover:bg-danger-soft hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <ActionForm action={addTerm} submitLabel="Agregar periodo">
            <Field label="Nombre" htmlFor="term-name">
              <input id="term-name" name="name" required placeholder={`${["I", "II", "III", "IV"][terms.length] ?? ""} Trimestre`.trim()} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="term-start">
                <input id="term-start" name="startsOn" type="date" required className={inputClass} />
              </Field>
              <Field label="Cierre" htmlFor="term-end">
                <input id="term-end" name="endsOn" type="date" required className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </Card>
      </aside>
    </div>
  );
}
