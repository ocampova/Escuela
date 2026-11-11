"use client";

import { useActionState } from "react";
import { createAnnouncement, type FormState } from "../../actions";
import { Button, Field, inputClass } from "@/components/ui";

export function AnnouncementForm({ targets }: { targets: { value: string; label: string; group: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createAnnouncement, {});
  const groups = [...new Set(targets.map((t) => t.group))];
  return (
    <form action={action} className="space-y-5">
      <Field label="Para" htmlFor="target">
        <select id="target" name="target" required className={inputClass} defaultValue={targets[0]?.value}>
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {targets
                .filter((t) => t.group === g)
                .map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Título" htmlFor="title">
        <input id="title" name="title" required maxLength={120} placeholder="Ej.: Gira educativa del viernes" className={inputClass} />
      </Field>
      <Field label="Mensaje" htmlFor="body" hint="Escriba como en una circular. Los saltos de línea se respetan.">
        <textarea id="body" name="body" required rows={8} className={`${inputClass} resize-y leading-relaxed`} />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 rounded-lg bg-canvas p-3">
        <input type="checkbox" name="requiresAck" defaultChecked className="mt-0.5 size-4 rounded" />
        <span className="text-sm">
          <span className="block font-medium">Pedir «Enterado» a las familias</span>
          <span className="text-ink-2">Podrá ver quién confirmó y a quién recordarle.</span>
        </span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar aviso"}
        </Button>
      </div>
    </form>
  );
}
