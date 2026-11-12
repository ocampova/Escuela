"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ArrowRight } from "lucide-react";
import { saveHomeReport } from "../../../academico-actions";
import type { ActionState } from "@/components/action-form";
import { ACHIEVEMENTS } from "@/lib/academic";
import { Button, buttonClass, cx, inputClass } from "@/components/ui";

const ON: Record<string, string> = { ok: "bg-ok text-white ring-ok", brand: "bg-brand text-white ring-brand", warn: "bg-warn text-white ring-warn" };

type Area = { id: string; name: string; achievement: string; comment: string };

export function HomeReportForm({ studentId, termId, firstName, areas, general, nextHref }: { studentId: string; termId: string; firstName: string; areas: Area[]; general: string; nextHref: string | null }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveHomeReport, {});
  const [ach, setAch] = useState(() => Object.fromEntries(areas.map((a) => [a.id, a.achievement])));
  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="termId" value={termId} />
      {areas.map((a) => (
        <fieldset key={a.id} className="space-y-2.5">
          <legend className="mb-2 font-semibold">{a.name}</legend>
          <div className="flex flex-wrap gap-1.5">
            {ACHIEVEMENTS.map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input type="radio" name={`ach-${a.id}`} value={o.value} checked={ach[a.id] === o.value} onChange={() => setAch((s) => ({ ...s, [a.id]: o.value }))} className="peer sr-only" />
                <span
                  className={cx(
                    "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                    ach[a.id] === o.value ? ON[o.tone] : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
                  )}
                >
                  {o.label}
                </span>
              </label>
            ))}
          </div>
          <textarea name={`com-${a.id}`} defaultValue={a.comment} rows={2} maxLength={1500} aria-label={`Comentario de ${a.name}`} placeholder={`Qué logró ${firstName} y cómo apoyarle en casa.`} className={inputClass} />
        </fieldset>
      ))}
      <div className="space-y-2 border-t border-line pt-5">
        <label htmlFor="general" className="font-semibold">Mensaje general para la familia</label>
        <textarea id="general" name="general" defaultValue={general} rows={4} maxLength={2000} className={inputClass} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{state.error}</p>}
        {state.ok && <p role="status" className="ack-in mr-auto text-sm font-medium text-ok">{state.ok}</p>}
        {state.ok && nextHref && (
          <Link href={nextHref} className={buttonClass("secondary")}>
            Siguiente alumno <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <Button type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar informe"}</Button>
      </div>
    </form>
  );
}
