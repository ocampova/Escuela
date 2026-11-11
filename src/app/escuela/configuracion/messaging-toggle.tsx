"use client";

import { useOptimistic, useTransition } from "react";
import { setMessaging } from "./actions";
import { cx } from "@/components/ui";

export function MessagingToggle({ enabled, canEdit }: { enabled: boolean; canEdit: boolean }) {
  const [on, setOn] = useOptimistic(enabled);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={!canEdit || pending}
      onClick={() =>
        start(async () => {
          setOn(!on);
          await setMessaging(!on);
        })
      }
      className="flex w-full items-center justify-between gap-4 rounded-lg bg-canvas px-3 py-3 text-left disabled:opacity-60"
    >
      <span className="text-sm">
        <span className="block font-medium">{on ? "Mensajes activados" : "Mensajes desactivados"}</span>
        <span className="text-ink-2">{on ? "Las familias pueden escribir a la docente y a la oficina." : "Las familias usan WhatsApp; la pestaña Mensajes no aparece."}</span>
      </span>
      <span aria-hidden className={cx("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-brand" : "bg-line-strong")}>
        <span className={cx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200", on ? "translate-x-[22px]" : "translate-x-0.5")} />
      </span>
    </button>
  );
}
