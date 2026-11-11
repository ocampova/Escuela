"use client";

import { useActionState } from "react";
import { setPassword, type PasswordState } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

export function PasswordForm({ token, email, cta }: { token: string; email: string; cta: string }) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(setPassword, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
      <Field label="Correo" htmlFor="email-ro">
        <p id="email-ro" className="rounded-lg bg-canvas px-3 py-2.5 text-[15px] text-ink-2">{email}</p>
      </Field>
      <Field label="Contraseña nueva" htmlFor="password" hint="Al menos 8 caracteres.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <Field label="Repita la contraseña" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Guardando…" : cta}
      </Button>
    </form>
  );
}
