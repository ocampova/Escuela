"use client";

import { useActionState, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { registerPickup, type FormState } from "../vida-actions";
import { Button, cx, inputClass } from "@/components/ui";

type Option = { value: string; name: string; detail: string };

/** Elegir quién recoge al alumno: encargados y autorizados; otra persona con confirmación. */
export function PickupForm({ studentId, studentName, options }: { studentId: string; studentName: string; options: Option[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(registerPickup, {});
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState("");

  if (!open)
    return (
      <div className="mt-2 pl-12">
        <button type="button" onClick={() => setOpen(true)} className="h-9 rounded-lg px-3 text-sm font-medium text-brand ring-1 ring-inset ring-line-strong hover:bg-canvas">
          Registrar salida
        </button>
      </div>
    );

  return (
    <form action={action} className="ack-in mt-3 space-y-3 rounded-xl bg-canvas p-3 sm:ml-12">
      <input type="hidden" name="studentId" value={studentId} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">¿Quién recoge a {studentName}?</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {[...options, { value: "other", name: "Otra persona", detail: "No está en la lista de autorizados" }].map((o) => (
            <label
              key={o.value}
              className={cx(
                "flex cursor-pointer items-start gap-2.5 rounded-lg bg-surface px-3 py-2.5 ring-1 ring-inset transition-colors",
                who === o.value ? (o.value === "other" ? "ring-2 ring-warn" : "ring-2 ring-brand") : "ring-line hover:ring-line-strong",
              )}
            >
              <input type="radio" name="who" value={o.value} checked={who === o.value} onChange={() => setWho(o.value)} className="mt-1 size-4 accent-brand" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{o.name}</span>
                <span className="block text-xs text-ink-2">{o.detail}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {who === "other" && (
        <div className="space-y-2 rounded-lg bg-warn-soft p-3">
          <p className="flex items-start gap-2 text-sm text-warn">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            Antes de entregarlo, confirme con la familia por teléfono y pida la cédula.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input name="otherName" required placeholder="Nombre completo" aria-label="Nombre completo" className={inputClass} />
            <input name="otherRelation" placeholder="Parentesco (opcional)" aria-label="Parentesco" className={inputClass} />
          </div>
        </div>
      )}
      <input
        name="note"
        required={who === "other"}
        placeholder={who === "other" ? "Cómo se confirmó (ej.: llamada a la mamá, cédula 1-1111-1111)" : "Nota (opcional)"}
        aria-label="Nota"
        className={inputClass}
      />
      <div className="flex flex-wrap items-center justify-end gap-2">
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{state.error}</p>}
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" size="sm" disabled={pending || !who}>
          {pending ? "Registrando…" : "Confirmar salida"}
        </Button>
      </div>
    </form>
  );
}
