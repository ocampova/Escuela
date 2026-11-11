"use client";

import { useActionState } from "react";
import { requestReset, type ForgotState } from "@/app/activar/actions";
import { Button, Field, inputClass } from "@/components/ui";

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});
  if (state.sent) {
    return (
      <p role="status" className="text-sm text-ink-2">
        Si el correo está registrado, le enviamos un enlace para crear una contraseña nueva. Revise también la carpeta de correo no deseado. Si no le llega, Secretaría puede enviarle el enlace por WhatsApp.
      </p>
    );
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Correo electrónico" htmlFor="email">
        <input id="email" name="email" type="email" autoComplete="email" required className={inputClass} />
      </Field>
      {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviarme el enlace"}
      </Button>
    </form>
  );
}
