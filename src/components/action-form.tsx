"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { Button, cx } from "./ui";
import { translator, type Locale } from "@/lib/i18n";

export type ActionState = { error?: string; ok?: string };

/** Formulario con mensajes de error y éxito para una server action. Se limpia al guardar. */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "Guardando…",
  children,
  className,
  inline,
  resetOnOk = true,
  variant = "primary",
  locale = "es",
}: {
  locale?: Locale;
  action: (prev: ActionState, form: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel?: string;
  children: ReactNode;
  className?: string;
  inline?: boolean;
  resetOnOk?: boolean;
  variant?: "primary" | "secondary";
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, {});
  useEffect(() => {
    if (state.ok && resetOnOk) ref.current?.reset();
  }, [state, resetOnOk]);
  return (
    <form ref={ref} action={formAction} className={cx(inline ? "flex flex-wrap items-end gap-3" : "space-y-4", className)}>
      {children}
      <div className={cx("flex flex-wrap items-center gap-3", !inline && "justify-end")}>
        {state.error && <p role="alert" className="mr-auto text-sm text-danger">{translator(locale)(state.error)}</p>}
        {state.ok && <p role="status" className="ack-in mr-auto text-sm font-medium text-ok">{translator(locale)(state.ok)}</p>}
        <Button type="submit" variant={variant} disabled={pending}>
          {pending ? translator(locale)(pendingLabel) : submitLabel}
        </Button>
      </div>
    </form>
  );
}
