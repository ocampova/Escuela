"use client";

import { translator, type Locale } from "@/lib/i18n";
import { useActionState, useState } from "react";
import { reportAbsence, type AbsenceState } from "./actions";
import { Button, Field, cx, inputClass } from "@/components/ui";

const REASONS = ["Enfermedad", "Cita médica", "Asunto familiar", "Llegará tarde", "Otro"];

export function AbsenceForm({ studentId, today, minDate, locale = "es" }: { studentId: string; today: string; minDate: string; locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<AbsenceState, FormData>(reportAbsence, {});
  const [from, setFrom] = useState(today);
  const [reason, setReason] = useState("");
  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="studentId" value={studentId} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium">{t("Motivo")}</legend>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <label key={r} className="cursor-pointer">
              <input type="radio" name="reason" value={r} required checked={reason === r} onChange={() => setReason(r)} className="peer sr-only" />
              <span className={cx("inline-flex h-10 items-center rounded-full px-4 text-sm font-medium ring-1 ring-inset transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand", reason === r ? "bg-brand text-white ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas")}>
                {t(r)}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t(reason === "Llegará tarde" ? "Día" : "Desde")} htmlFor="dateFrom">
          <input id="dateFrom" name="dateFrom" type="date" required min={minDate} value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </Field>
        <Field label={t("Hasta")} htmlFor="dateTo">
          <input id="dateTo" name="dateTo" type="date" required min={from} defaultValue={today} key={from} className={inputClass} />
        </Field>
      </div>
      <Field label={t("Detalle para la docente (opcional)")} htmlFor="note">
        <textarea id="note" name="note" rows={3} maxLength={300} placeholder={t(reason === "Llegará tarde" ? "Ej.: llega a las 9:00 por cita en el EBAIS" : "Ej.: tiene fiebre, le avisamos cuando regrese")} className={inputClass} />
      </Field>
      {state.error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{t(state.error)}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t(pending ? "Enviando…" : "Avisar a la docente")}
      </Button>
    </form>
  );
}
