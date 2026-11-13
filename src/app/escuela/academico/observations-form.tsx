"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { OBSERVATION_PHRASES } from "@/lib/phrases";
import { saveObservations } from "../academico-actions";
import type { ActionState } from "@/components/action-form";
import { Avatar, Button, inputClass } from "@/components/ui";

export function ObservationsForm({
  sectionId,
  termId,
  rows,
}: {
  sectionId: string;
  termId: string;
  rows: { id: string; name: string; color: string; comment: string }[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveObservations,
    {},
  );
  const [text, setText] = useState(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.comment])),
  );
  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="termId" value={termId} />
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <label
              htmlFor={`obs-${r.id}`}
              className="mb-2 flex items-center gap-2.5 font-medium"
            >
              <Avatar name={r.name} color={r.color} size={28} /> {r.name}
            </label>
            <textarea
              id={`obs-${r.id}`}
              name={`obs-${r.id}`}
              value={text[r.id]}
              onChange={(e) =>
                setText((t) => ({ ...t, [r.id]: e.target.value }))
              }
              rows={2}
              maxLength={1500}
              placeholder="Fortalezas, aspectos por mejorar y recomendaciones para la casa."
              className={inputClass}
            />
            <details className="group mt-2">
              <summary className="tap inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-brand hover:underline">
                <Plus
                  className="size-3 transition-transform group-open:rotate-45"
                  aria-hidden
                />{" "}
                Frases sugeridas
              </summary>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {OBSERVATION_PHRASES.map((p) => {
                  const phrase = p.replaceAll("{nombre}", r.name.split(" ")[0]);
                  const used = text[r.id].includes(phrase);
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={used}
                      onClick={() =>
                        setText((t) => ({
                          ...t,
                          [r.id]: t[r.id].trim()
                            ? `${t[r.id].trim()} ${phrase}`
                            : phrase,
                        }))
                      }
                      className={`inline-flex items-start gap-1 rounded-full px-2.5 py-1 text-left text-xs ring-1 ring-inset transition-colors ${used ? "bg-canvas text-ink-3 ring-line" : "bg-surface text-ink-2 ring-line-strong hover:bg-brand-soft hover:text-brand-ink"}`}
                    >
                      <Plus className="mt-0.5 size-3 shrink-0" aria-hidden />
                      {phrase}
                    </button>
                  );
                })}
              </div>
            </details>
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm">
        {state.error && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p
            role="status"
            className="ack-in mr-auto text-sm font-medium text-ok"
          >
            {state.ok}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar observaciones"}
        </Button>
      </div>
    </form>
  );
}
