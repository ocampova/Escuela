"use client";

import { translator, type Locale } from "@/lib/i18n";
import Link from "next/link";
import { useActionState } from "react";
import { acceptPrivacy, type ConsentState } from "./actions";
import { Button, cx } from "@/components/ui";

export function ConsentForm({ kids, locale = "es" }: { kids: { id: string; name: string; consent: boolean | null }[]; locale?: Locale }) {
  const t = translator(locale);
  const [state, action, pending] = useActionState<ConsentState, FormData>(acceptPrivacy, {});
  return (
    <form action={action} className="space-y-6">
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-2">
        <p>{t("Antes de empezar, le contamos cómo cuidamos los datos de su familia:")}</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>{t("Usamos sus datos solo para la vida escolar: avisos, asistencia, seguridad a la salida y cobros.")}</li>
          <li>{t("La docente ve únicamente a sus secciones. No vendemos ni compartimos datos con fines publicitarios.")}</li>
          <li>{t("Los datos de salud se usan solo para cuidar a su hijo.")}</li>
          <li>{t("Puede pedir ver, corregir o eliminar sus datos cuando quiera.")}</li>
        </ul>
        <p>
          <Link href="/privacidad" target="_blank" className="font-medium text-brand underline">
            {t("Leer el aviso de privacidad completo")}
          </Link>
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="mb-1 text-[15px] font-semibold text-ink">{t("Fotografías en la plataforma")}</legend>
        <p className="text-sm text-ink-2">{t("Las fotos de las actividades se muestran solo a las familias de la sección, nunca en público. Puede cambiar su decisión en su perfil.")}</p>
        {kids.map((k) => (
          <div key={k.id} className="rounded-lg bg-canvas p-3">
            <p className="mb-2 text-sm font-medium">{t("¿Autoriza que {name} aparezca en fotos de su sección?", { name: k.name })}</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                ["yes", "Sí, autorizo"],
                ["no", "No autorizo"],
              ].map(([v, label]) => (
                <label key={v} className="cursor-pointer">
                  <input type="radio" name={`photo-${k.id}`} value={v} defaultChecked={k.consent === (v === "yes")} className="peer sr-only" required />
                  <span className={cx("flex h-11 items-center justify-center rounded-lg bg-surface text-sm font-medium ring-1 ring-inset ring-line-strong transition-colors peer-checked:bg-brand peer-checked:text-white peer-checked:ring-brand peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand")}>
                    {t(label)}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg p-1 text-sm">
        <input type="checkbox" name="accept" required className="mt-0.5 size-4" />
        <span>{t("He leído el aviso de privacidad y acepto el tratamiento de mis datos y los de mis hijos según la Ley 8968.")}</span>
      </label>
      {state.error && (
        <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {t(state.error)}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {t(pending ? "Guardando…" : "Aceptar y continuar")}
      </Button>
    </form>
  );
}
