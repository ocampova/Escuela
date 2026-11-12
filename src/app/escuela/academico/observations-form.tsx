"use client";

import { useActionState } from "react";
import { saveObservations } from "../academico-actions";
import type { ActionState } from "@/components/action-form";
import { Avatar, Button, inputClass } from "@/components/ui";

export function ObservationsForm({ sectionId, termId, rows }: { sectionId: string; termId: string; rows: { id: string; name: string; color: string; comment: string }[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveObservations, {});
  return (
    <form action={action}>
      <input type="hidden" name="sectionId" value={sectionId} />
      <input type="hidden" name="termId" value={termId} />
      <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <label htmlFor={`obs-${r.id}`} className="mb-2 flex items-center gap-2.5 font-medium">
              <Avatar name={r.name} color={r.color} size={28} /> {r.name}
            </label>
            <textarea id={`obs-${r.id}`} name={`obs-${r.id}`} defaultValue={r.comment} rows={2} maxLength={1500} placeholder="Fortalezas, aspectos por mejorar y recomendaciones para la casa." className={inputClass} />
          </li>
        ))}
      </ul>
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur-sm">
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="ack-in mr-auto text-sm font-medium text-ok">{state.ok}</p>}
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar observaciones"}</Button>
      </div>
    </form>
  );
}
