"use client";

import { translator, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import { Button, Field, inputClass } from "@/components/ui";

const DEMO = [
  { label: "Familia", email: "familia@demo.scs.cr", who: "Carolina, mamá de Mateo y Valeria" },
  { label: "Dirección", email: "directora@demo.scs.cr", who: "Laura Méndez, directora" },
  { label: "Docente", email: "schaves@demo.scs.cr", who: "Sofía Chaves, Preparatoria A" },
];

export function LoginForm({ next, demo = false, locale = "es" }: { next?: string; demo?: boolean; locale?: Locale }) {
  const t = translator(locale);
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
        <Field label={t("Correo electrónico")} htmlFor="email">
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" required defaultValue={state.email} className={inputClass} />
        </Field>
        <Field label={t("Contraseña")} htmlFor="password">
          <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
        </Field>
        {state.error && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {t(state.error)}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {t(pending ? "Entrando…" : "Entrar")}
        </Button>
        <p className="text-center">
          <Link href="/olvide" className="text-sm font-medium text-brand hover:underline">{t("Olvidé mi contraseña")}</Link>
        </p>
      </form>

      {demo && (
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-sm font-medium text-ink">{t("Entrar con una cuenta de demostración")}</p>
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
                <span className="block text-sm font-medium text-ink">{t(d.label)}</span>
                <span className="block text-xs text-ink-2">{t(d.who)}</span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-ink-3" aria-hidden />
            </button>
          ))}
        </div>
      </div>
      )}
    </>
  );
}
