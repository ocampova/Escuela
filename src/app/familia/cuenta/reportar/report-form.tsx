"use client";

import { useActionState, useState } from "react";
import { Camera } from "lucide-react";
import { reportPayment, type ReportState } from "../actions";
import { Button, Field, inputClass } from "@/components/ui";

type Kid = { id: string; name: string; open: { description: string; pending: number; currency: string }[] };

export function ReportForm({ kids, today }: { kids: Kid[]; today: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportPayment, {});
  const v = state.fields ?? {};
  const [kidId, setKidId] = useState(v.studentId ?? kids[0]?.id ?? "");
  const [concept, setConcept] = useState(v.concept ?? "");
  const [amount, setAmount] = useState(v.amount ?? "");
  const [currency, setCurrency] = useState(v.currency ?? "CRC");
  const [fileName, setFileName] = useState("");
  const kid = kids.find((k) => k.id === kidId);

  return (
    <form action={action} className="space-y-5">
      <Field label="Estudiante" htmlFor="studentId">
        <select id="studentId" name="studentId" value={kidId} onChange={(e) => setKidId(e.target.value)} className={inputClass}>
          {kids.map((k) => (
            <option key={k.id} value={k.id}>{k.name}</option>
          ))}
        </select>
      </Field>

      {kid && kid.open.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-medium">¿Qué está pagando?</p>
          <div className="flex flex-wrap gap-2">
            {kid.open.map((o) => (
              <button
                key={o.description}
                type="button"
                onClick={() => {
                  setConcept(o.description);
                  setAmount(String(o.pending));
                  setCurrency(o.currency);
                }}
                className={`rounded-full px-3 py-1.5 text-sm ring-1 ring-inset transition-colors ${concept === o.description ? "bg-brand text-white ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas"}`}
              >
                {o.description}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field label="Concepto" htmlFor="concept" hint="Ej.: Mensualidad noviembre, Matrícula 2027, Materiales.">
        <input id="concept" name="concept" required value={concept} onChange={(e) => setConcept(e.target.value)} className={inputClass} />
      </Field>
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Monto pagado" htmlFor="amount">
          <input id="amount" name="amount" required inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${inputClass} tabular`} />
        </Field>
        <Field label="Moneda" htmlFor="currency">
          <select id="currency" name="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputClass}>
            <option value="CRC">Colones</option>
            <option value="USD">Dólares</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha del pago" htmlFor="paidAt">
          <input id="paidAt" name="paidAt" type="date" required max={today} defaultValue={v.paidAt ?? today} className={inputClass} />
        </Field>
        <Field label="Forma de pago" htmlFor="method">
          <select id="method" name="method" defaultValue={v.method ?? "TRANSFER"} className={inputClass}>
            <option value="TRANSFER">Transferencia</option>
            <option value="DEPOSIT">Depósito</option>
            <option value="SINPE">SINPE Móvil</option>
          </select>
        </Field>
      </div>
      <Field label="Número de comprobante (opcional)" htmlFor="reference">
        <input id="reference" name="reference" defaultValue={v.reference} className={inputClass} />
      </Field>

      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 ring-1 ring-inset ring-line-strong transition-colors hover:bg-canvas has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Camera className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium">{fileName || "Foto o PDF del comprobante"}</span>
          <span className="block text-xs text-ink-3">{fileName ? "Toque para cambiarlo" : "Puede tomar la foto con el celular. Hasta 5 MB."}</span>
        </span>
        <input type="file" name="receipt" required accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")} />
      </label>

      <Field label="Nota para Secretaría (opcional)" htmlFor="note">
        <textarea id="note" name="note" rows={2} defaultValue={v.note} className={inputClass} />
      </Field>

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Reportar pago"}
      </Button>
    </form>
  );
}
