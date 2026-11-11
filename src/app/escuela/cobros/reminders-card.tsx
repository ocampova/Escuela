"use client";

import { useOptimistic, useTransition } from "react";
import { BellRing } from "lucide-react";
import { sendRemindersNow, setReminders } from "../actions";
import { ActionForm } from "@/components/action-form";
import { Card, cx } from "@/components/ui";

export function RemindersCard({ enabled, canToggle, sentToday }: { enabled: boolean; canToggle: boolean; sentToday: number }) {
  const [on, setOn] = useOptimistic(enabled);
  const [pending, start] = useTransition();
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <BellRing className="size-[18px]" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold">Recordatorios de pago</h2>
          <p className="mt-0.5 text-sm text-ink-2">Notificación y correo a cada familia: 3 días antes del vencimiento y a los 1, 8, 15 y 30 días de atraso.</p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={!canToggle || pending}
        onClick={() =>
          start(async () => {
            setOn(!on);
            await setReminders(!on);
          })
        }
        className="mb-4 flex w-full items-center justify-between gap-4 rounded-lg bg-canvas px-3 py-2.5 text-left text-sm disabled:opacity-60"
      >
        <span className="font-medium">{on ? "Automáticos activados" : "Automáticos desactivados"}</span>
        <span aria-hidden className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-line-strong")}>
          <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200", on ? "translate-x-[22px]" : "translate-x-0.5")} />
        </span>
      </button>
      {sentToday > 0 && <p className="mb-3 text-xs text-ink-3">Hoy ya se enviaron recordatorios a {sentToday} {sentToday === 1 ? "familia" : "familias"}.</p>}
      <ActionForm action={sendRemindersNow} submitLabel="Enviar ahora" pendingLabel="Enviando…" variant="secondary" resetOnOk={false}>
        <p className="text-sm text-ink-2">A todas las familias con algo vencido o por vencer en los próximos 3 días.</p>
      </ActionForm>
    </Card>
  );
}
