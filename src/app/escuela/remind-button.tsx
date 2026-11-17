"use client";

import { useState, useTransition } from "react";
import { BellRing, Check } from "lucide-react";
import { remindAttendance } from "./actions";

/** Dirección: recordar a la docente, con una notificación, que falta pasar lista. */
export function RemindButton({ sectionId, teacher, sent }: { sectionId: string; teacher: string; sent: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(sent ? "Recordado hoy" : null);
  if (msg)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-2">
        <Check className="size-3.5 text-ok" aria-hidden /> {msg}
      </span>
    );
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => {
        const r = await remindAttendance(sectionId);
        setMsg(r.ok ?? r.error ?? null);
      })}
      className="tap inline-flex items-center gap-1 text-sm font-medium whitespace-nowrap text-brand hover:underline disabled:opacity-50"
      title={`Enviar una notificación a ${teacher}`}
    >
      <BellRing className="size-3.5" aria-hidden /> {pending ? "Enviando…" : `Recordar a ${teacher}`}
    </button>
  );
}
