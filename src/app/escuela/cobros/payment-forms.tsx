"use client";

import { useActionState, useRef } from "react";
import { generateMonthlyCharges, registerPayment, type FormState } from "../actions";
import { Button, Field, inputClass } from "@/components/ui";

export function PaymentForm({ students, selected, today }: { students: { id: string; label: string; due: number }[]; selected?: string; today: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await registerPayment(prev, fd);
    if (r.ok) ref.current?.reset();
    return r;
  }, {});
  const sel = students.find((s) => s.id === selected);
  return (
    <form ref={ref} action={action} className="space-y-4" key={selected}>
      <Field label="Alumno" htmlFor="pay-student">
        <select id="pay-student" name="studentId" required defaultValue={selected ?? ""} className={inputClass}>
          <option value="" disabled>
            Elegir alumno…
          </option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Monto (₡)" htmlFor="pay-amount">
          <input id="pay-amount" name="amount" inputMode="numeric" required defaultValue={sel?.due || ""} placeholder="148000" className={`${inputClass} tabular`} />
        </Field>
        <Field label="Fecha" htmlFor="pay-date">
          <input id="pay-date" name="paidAt" type="date" required defaultValue={today} max={today} className={inputClass} />
        </Field>
      </div>
      <Field label="Medio de pago" htmlFor="pay-method">
        <select id="pay-method" name="method" className={inputClass} defaultValue="SINPE">
          <option value="DEPOSIT">Depósito</option>
          <option value="SINPE">SINPE Móvil</option>
          <option value="TRANSFER">Transferencia</option>
          <option value="CASH">Efectivo</option>
        </select>
      </Field>
      <Field label="Referencia o comprobante" htmlFor="pay-ref">
        <input id="pay-ref" name="reference" placeholder="Ej.: SP12345678" className={inputClass} />
      </Field>
      <Field label="Concepto" htmlFor="pay-note">
        <input id="pay-note" name="note" placeholder="Ej.: Mensualidad noviembre" className={inputClass} />
      </Field>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="ack-in text-sm font-medium text-ok">{state.ok}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Registrando…" : "Registrar pago"}
      </Button>
    </form>
  );
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

function monthOptions(current: string) {
  const [y, m] = current.split("-").map(Number);
  return [-1, 0, 1].map((d) => {
    const date = new Date(Date.UTC(y, m - 1 + d, 1));
    const yy = date.getUTCFullYear();
    const mm = date.getUTCMonth();
    return { value: `${yy}-${String(mm + 1).padStart(2, "0")}`, label: `${MONTHS[mm]} ${yy}` };
  });
}

export function MonthlyChargesForm({ month }: { month: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(generateMonthlyCharges, {});
  return (
    <form action={action} className="space-y-3">
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Mes</span>
          <select name="month" defaultValue={month} className={inputClass}>
            {monthOptions(month).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Generando…" : "Generar"}
        </Button>
      </div>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p role="status" className="ack-in text-sm text-ok">{state.ok}</p>}
    </form>
  );
}
