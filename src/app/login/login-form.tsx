"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

const DEMO = [
  { label: "Familia", email: "familia@demo.scs.cr", who: "Carolina, mamá de Mateo y Valeria" },
  { label: "Dirección", email: "directora@demo.scs.cr", who: "Laura Méndez, directora" },
  { label: "Docente", email: "schaves@demo.scs.cr", who: "Sofía Chaves, Preparatoria A" },
];

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  function fill(email: string) {
    const f = document.getElementById("login-form") as HTMLFormElement | null;
    if (!f) return;
    (f.elements.namedItem("email") as HTMLInputElement).value = email;
    (f.elements.namedItem("password") as HTMLInputElement).value = "demo1234";
    f.requestSubmit();
  }

  return (
    <>
      <form id="login-form" action={action} className="space-y-4">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Correo electrónico" htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} className={inputClass} />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        {state.error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
        <p className="text-center">
          <Link href="/olvide" className="text-sm font-medium text-brand hover:underline">Olvidé mi contraseña</Link>
        </p>
      </form>

      <div className="mt-8 border-t border-line pt-6">
        <p className="text-sm font-medium text-ink">Entrar con una cuenta de demostración</p>
        <div className="mt-3 grid gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              onClick={() => fill(d.email)}
              disabled={pending}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left ring-1 ring-inset ring-line transition-colors hover:bg-brand-soft hover:ring-[#cfe0d9] disabled:opacity-50"
            >
              <span>
                <span className="block text-sm font-medium text-ink">{d.label}</span>
                <span className="block text-xs text-ink-2">{d.who}</span>
              </span>
              <span aria-hidden className="text-ink-3">→</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
