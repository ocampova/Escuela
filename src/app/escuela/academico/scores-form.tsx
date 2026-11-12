"use client";

import { useActionState, useState } from "react";
import { saveScores } from "../academico-actions";
import type { ActionState } from "@/components/action-form";
import { Avatar, Button, cx } from "@/components/ui";
import { PASSING } from "@/lib/academic";

type Comp = { id: string; name: string; weight: number };
type Row = { id: string; name: string; color: string; support?: string | null; values: Record<string, string> };

function total(comps: Comp[], v: Record<string, string>) {
  const filled = comps.filter((c) => v[c.id] !== "" && Number.isFinite(Number(v[c.id].replace(",", "."))));
  if (!filled.length) return null;
  return Math.round(filled.reduce((a, c) => a + (Number(v[c.id].replace(",", ".")) * c.weight) / 100, 0));
}

export function ScoresForm({ sectionId, termId, subjectId, components, rows }: { sectionId: string; termId: string; subjectId: string; components: Comp[]; rows: Row[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveScores, {});
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((r) => [r.id, r.values])));
  const [pasted, setPasted] = useState(0);

  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="termId" value={termId} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink-2">
              <th scope="col" className="sticky left-0 bg-surface px-4 py-2.5 font-medium">Alumno</th>
              {components.map((c) => (
                <th key={c.id} scope="col" className="px-2 py-2.5 text-center font-medium">
                  {c.name}
                  <span className="block font-normal text-ink-3">{c.weight}%</span>
                </th>
              ))}
              <th scope="col" className="px-4 py-2.5 text-center font-medium">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((r, ri) => {
              const t = total(components, values[r.id]);
              const complete = components.every((c) => values[r.id][c.id] !== "");
              return (
                <tr key={r.id}>
                  <th scope="row" className="sticky left-0 bg-surface px-4 py-2 text-left font-medium">
                    <span className="flex items-center gap-2.5">
                      <Avatar name={r.name} color={r.color} size={28} />
                      <span className="min-w-0">
                        <span className="block max-w-[10rem] truncate">{r.name}</span>
                        {r.support && <span className="block max-w-[10rem] truncate text-xs font-normal text-brand" title={r.support}>{r.support}</span>}
                      </span>
                    </span>
                  </th>
                  {components.map((c, ci) => (
                    <td key={c.id} className="px-2 py-2 text-center">
                      <input
                        name={`s-${r.id}-${c.id}`}
                        inputMode="decimal"
                        value={values[r.id][c.id]}
                        onChange={(e) => setValues((v) => ({ ...v, [r.id]: { ...v[r.id], [c.id]: e.target.value.replace(/[^\d.,]/g, "").slice(0, 5) } }))}
                        aria-label={`${c.name} de ${r.name}`}
                        data-cell={`${ri}:${ci}`}
                        onFocus={(e) => e.currentTarget.select()}
                        onKeyDown={(e) => {
                          const go = (dr: number, dc: number) => {
                            const el = document.querySelector<HTMLInputElement>(`[data-cell="${ri + dr}:${ci + dc}"]`);
                            if (el) {
                              e.preventDefault();
                              el.focus();
                            }
                          };
                          if (e.key === "Enter" || e.key === "ArrowDown") go(e.shiftKey ? -1 : 1, 0);
                          else if (e.key === "ArrowUp") go(-1, 0);
                        }}
                        onPaste={(e) => {
                          const text = e.clipboardData.getData("text");
                          if (!/[\t\n]/.test(text.trim())) return;
                          e.preventDefault();
                          const grid = text.replace(/\r/g, "").replace(/\n$/, "").split("\n").map((line) => line.split("\t"));
                          setValues((v) => {
                            const next = { ...v };
                            grid.forEach((line, dr) => {
                              const row = rows[ri + dr];
                              if (!row) return;
                              next[row.id] = { ...next[row.id] };
                              line.forEach((cell, dc) => {
                                const comp = components[ci + dc];
                                if (comp) next[row.id][comp.id] = cell.trim().replace(/[^\d.,]/g, "").slice(0, 5);
                              });
                            });
                            return next;
                          });
                          setPasted(Math.min(grid.length, rows.length - ri));
                        }}
                        className="tabular h-10 w-16 rounded-lg bg-canvas text-center ring-1 ring-inset ring-line focus:bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                    </td>
                  ))}
                  <td className="px-4 py-2 text-center">
                    <span
                      title={!complete && t !== null ? "Acumulado: faltan componentes" : undefined}
                      className={cx("tabular inline-flex min-w-11 justify-center rounded-lg px-2 py-1.5 font-semibold", t === null ? "text-ink-3" : !complete ? "bg-canvas text-ink-2" : t < PASSING ? "bg-danger-soft text-danger" : "bg-ok-soft text-ok")}
                    >
                      {t ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm">
        <p className="mr-auto text-xs text-ink-3">
          {pasted > 0 ? <span className="font-medium text-ok">Se pegaron las notas de {pasted} {pasted === 1 ? "alumno" : "alumnos"}. Revise y guarde. </span> : null}
          Puede copiar una o varias columnas desde Excel y pegarlas aquí. Enter baja al siguiente alumno. Mínimo para aprobar: {PASSING}; en gris, lo acumulado.
        </p>
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="ack-in text-sm font-medium text-ok">{state.ok}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar notas"}</Button>
      </div>
    </form>
  );
}
