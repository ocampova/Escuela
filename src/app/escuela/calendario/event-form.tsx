"use client";

import { useActionState, useRef } from "react";
import { createEvent, type FormState } from "../actions";
import { Button, Field, inputClass } from "@/components/ui";

export function EventForm({ targets, today }: { targets: { value: string; label: string }[]; today: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await createEvent(prev, fd);
    if (r.ok) ref.current?.reset();
    return r;
  }, {});
  return (
    <form ref={ref} action={action} className="space-y-4">
      <Field label="Título" htmlFor="ev-title">
        <input id="ev-title" name="title" required placeholder="Ej.: Reunión de padres" className={inputClass} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha" htmlFor="ev-date">
          <input id="ev-date" name="date" type="date" required min={today} className={inputClass} />
        </Field>
        <Field label="Hora" htmlFor="ev-time" hint="Vacío: todo el día">
          <input id="ev-time" name="time" type="time" className={inputClass} />
        </Field>
      </div>
      <Field label="Tipo" htmlFor="ev-kind">
        <select id="ev-kind" name="kind" className={inputClass} defaultValue="evento">
          <option value="evento">Evento</option>
          <option value="reunion">Reunión</option>
          <option value="gira">Gira</option>
          <option value="actividad">Actividad</option>
          <option value="feriado">Sin lecciones</option>
          <option value="pago">Pago</option>
        </select>
      </Field>
      <Field label="Para" htmlFor="ev-target">
        <select id="ev-target" name="target" className={inputClass}>
          {targets.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Detalle (opcional)" htmlFor="ev-desc">
        <textarea id="ev-desc" name="description" rows={3} className={inputClass} />
      </Field>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="ack-in text-sm font-medium text-ok">{state.ok}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Agregando…" : "Agregar al calendario"}
      </Button>
    </form>
  );
}
