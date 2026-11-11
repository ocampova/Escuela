"use client";

import { useActionState, useState } from "react";
import { saveAttendance, type FormState } from "../actions";
import { Avatar, Button, cx } from "@/components/ui";

type Row = { id: string; name: string; color: string; allergies: string | null; status: string | null; note: string | null };

const OPTIONS = [
  { value: "PRESENT", label: "Presente", plural: "presentes", short: "P", on: "bg-ok text-white ring-ok" },
  { value: "LATE", label: "Tardía", plural: "tardías", short: "T", on: "bg-warn text-white ring-warn" },
  { value: "ABSENT", label: "Ausente", plural: "ausentes", short: "A", on: "bg-danger text-white ring-danger" },
  { value: "EXCUSED", label: "Justificada", plural: "justificadas", short: "J", on: "bg-ink-2 text-white ring-ink-2" },
];

export function AttendanceForm({ sectionId, date, rows, alreadyTaken }: { sectionId: string; date: string; rows: Row[]; alreadyTaken: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveAttendance, {});
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(rows.map((r) => [r.id, r.status ?? "PRESENT"])));
  const counts = OPTIONS.map((o) => ({ ...o, n: Object.values(values).filter((v) => v === o.value).length }));

  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="date" value={date} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3">
        <p className="text-sm text-ink-2">
          {counts.map((c, i) => (
            <span key={c.value}>
              {i > 0 && " · "}
              <span className="tabular font-medium text-ink">{c.n}</span> {c.n === 1 ? c.label.toLowerCase() : c.plural}
            </span>
          ))}
        </p>
        <button
          type="button"
          onClick={() => setValues(Object.fromEntries(rows.map((r) => [r.id, "PRESENT"])))}
          className="text-sm font-medium text-brand hover:underline"
        >
          Marcar todos presentes
        </button>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const v = values[r.id];
          return (
            <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <Avatar name={r.name} color={r.color} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.name}</p>
                {r.allergies && <p className="truncate text-xs text-danger">Alergia: {r.allergies}</p>}
              </div>
              <fieldset className="grid w-full grid-cols-2 gap-1.5 sm:flex sm:w-auto">
                <legend className="sr-only">Asistencia de {r.name}</legend>
                {OPTIONS.map((o) => (
                  <label key={o.value} title={o.label} className="cursor-pointer">
                    <input
                      type="radio"
                      name={`status-${r.id}`}
                      value={o.value}
                      checked={v === o.value}
                      onChange={() => setValues((s) => ({ ...s, [r.id]: o.value }))}
                      className="peer sr-only"
                    />
                    <span
                      className={cx(
                        "flex h-11 items-center justify-center rounded-lg px-2 text-sm font-semibold ring-1 ring-inset transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand sm:h-10 sm:min-w-[92px]",
                        v === o.value ? o.on : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
                      )}
                    >
                      {o.label}
                    </span>
                  </label>
                ))}
              </fieldset>
              {(v === "ABSENT" || v === "EXCUSED" || v === "LATE") && (
                <input
                  name={`note-${r.id}`}
                  defaultValue={r.note ?? ""}
                  placeholder="Nota (opcional): motivo, hora de llegada…"
                  className="ack-in order-last w-full rounded-lg bg-canvas px-3 py-2 text-sm ring-1 ring-inset ring-line placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              )}
            </li>
          );
        })}
      </ul>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm">
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="ack-in mr-auto text-sm font-medium text-ok">{state.ok}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : alreadyTaken ? "Actualizar lista" : "Guardar lista"}
        </Button>
      </div>
    </form>
  );
}
