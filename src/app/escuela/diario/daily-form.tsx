"use client";

import { useActionState, useState } from "react";
import { Check } from "lucide-react";
import { saveDailyReports, type FormState } from "../vida-actions";
import { DAILY_DEFAULTS, DAILY_FIELDS, type DailyKey } from "@/lib/daily";
import { Avatar, Button, cx, inputClass } from "@/components/ui";

type Row = { id: string; name: string; color: string; absent: boolean; sent: boolean; values: Record<DailyKey, string>; note: string };

const selectClass =
  "h-10 w-full rounded-lg bg-surface px-2.5 text-sm ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand";

export function DailyForm({ sectionId, date, rows, activity }: { sectionId: string; date: string; rows: Row[]; activity: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDailyReports, {});
  const [values, setValues] = useState(() => Object.fromEntries(rows.map((r) => [r.id, r.values])) as Record<string, Record<DailyKey, string>>);

  const fillDefaults = () =>
    setValues((v) =>
      Object.fromEntries(
        rows.map((r) => [r.id, r.absent ? v[r.id] : (Object.fromEntries(DAILY_FIELDS.map((f) => [f.key, v[r.id][f.key] || DAILY_DEFAULTS[f.key]])) as Record<DailyKey, string>)]),
      ),
    );

  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />
      <div className="space-y-2 border-b border-line px-4 py-4">
        <label htmlFor="activity" className="text-sm font-medium">
          Hoy trabajamos <span className="font-normal text-ink-3">(lo ve toda la sección)</span>
        </label>
        <textarea id="activity" name="activity" rows={2} defaultValue={activity} maxLength={600} placeholder="Ej.: Conocimos los colores primarios y pintamos con témperas." className={inputClass} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/60 px-4 py-2.5">
        <p className="text-sm text-ink-2">Llene lo habitual de un toque y cambie solo lo distinto.</p>
        <button type="button" onClick={fillDefaults} className="text-sm font-medium text-brand hover:underline">
          Llenar todos con lo habitual
        </button>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className={cx("px-4 py-4", r.absent && "opacity-60")}>
            <div className="mb-3 flex items-center gap-3">
              <Avatar name={r.name} color={r.color} size={32} />
              <p className="min-w-0 flex-1 truncate font-medium">{r.name}</p>
              {r.absent && <span className="text-xs font-medium text-ink-3">Ausente</span>}
              {r.sent && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-ok">
                  <Check className="size-3.5" aria-hidden /> Enviado
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,1.6fr)]">
              {DAILY_FIELDS.map((f) => (
                <label key={f.key} className="block">
                  <span className="mb-1 block text-xs text-ink-2">{f.label}</span>
                  <select
                    name={`${f.key}-${r.id}`}
                    value={values[r.id][f.key]}
                    onChange={(e) => setValues((v) => ({ ...v, [r.id]: { ...v[r.id], [f.key]: e.target.value } }))}
                    className={cx(selectClass, !values[r.id][f.key] && "text-ink-3")}
                  >
                    <option value="">Sin dato</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <label className="col-span-2 block lg:col-span-1">
                <span className="mb-1 block text-xs text-ink-2">Nota para la familia</span>
                <input name={`note-${r.id}`} defaultValue={r.note} maxLength={500} placeholder="Opcional" className={cx(inputClass, "h-10 py-2")} />
              </label>
            </div>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm">
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="ack-in mr-auto text-sm font-medium text-ok">{state.ok}</p>}
        <Button type="submit" name="send" value="0" variant="secondary" disabled={pending}>
          Guardar borrador
        </Button>
        <Button type="submit" name="send" value="1" disabled={pending}>
          {pending ? "Enviando…" : "Enviar a las familias"}
        </Button>
      </div>
    </form>
  );
}
