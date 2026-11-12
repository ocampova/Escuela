import Link from "next/link";
import type { Metadata } from "next";
import { LogOut } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateTimeLabel } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Avatar, Card, Field, SectionHeading, buttonClass, inputClass } from "@/components/ui";
import { logout } from "@/app/login/actions";
import { changePassword, updateContact, updatePreferences } from "./actions";

import { i18n } from "@/lib/i18n-server";
import { LanguageSwitch } from "@/components/language-switch";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Mi perfil") };
}

export default async function ProfilePage() {
  const user = await requireGuardian();
  const { t, locale } = await i18n();
  const kids = await prisma.student.findMany({ where: { guardians: { some: { userId: user.id } } }, select: { id: true, firstName: true, photoConsent: true }, orderBy: { birthDate: "asc" } });
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} size={56} />
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{user.name}</h1>
          <p className="text-sm text-ink-2">{user.email}</p>
        </div>
      </div>

      <section>
        <SectionHeading title={t("Idioma / Language")} />
        <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-ink-2">{t("Idioma de la plataforma. Los avisos y mensajes de la escuela se muestran como los escribió el personal.")}</p>
          <LanguageSwitch locale={locale} />
        </Card>
      </section>

      <div className="grid gap-8 md:grid-cols-2 md:items-start">
        <section>
          <SectionHeading title={t("Datos de contacto")} />
          <Card className="p-5">
            <ActionForm action={updateContact} submitLabel={t("Guardar")} resetOnOk={false} locale={locale}>
              <Field label={t("Correo")} htmlFor="p-email" hint={t("Es con el que entra a la plataforma y donde recibe los correos.")}>
                <input id="p-email" name="email" type="email" required defaultValue={user.email} className={inputClass} />
              </Field>
              <Field label={t("Teléfono o WhatsApp")} htmlFor="p-phone">
                <input id="p-phone" name="phone" inputMode="tel" required defaultValue={user.phone ?? ""} className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        </section>

        <section>
          <SectionHeading title={t("Contraseña")} />
          <Card className="p-5">
            <ActionForm action={changePassword} submitLabel={t("Cambiar contraseña")} locale={locale}>
              <input type="email" name="username" autoComplete="username" defaultValue={user.email} hidden readOnly />
              <Field label={t("Contraseña actual")} htmlFor="pw-cur">
                <input id="pw-cur" name="current" type="password" autoComplete="current-password" required className={inputClass} />
              </Field>
              <Field label={t("Contraseña nueva")} htmlFor="pw-new" hint={t("Al menos 8 caracteres.")}>
                <input id="pw-new" name="next" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
              </Field>
              <Field label={t("Repita la contraseña nueva")} htmlFor="pw-conf">
                <input id="pw-conf" name="confirm" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        </section>
      </div>

      <section>
        <SectionHeading title={t("Correos y fotografías")} />
        <Card className="p-5">
          <ActionForm action={updatePreferences} submitLabel={t("Guardar preferencias")} resetOnOk={false} locale={locale}>
            <fieldset className="space-y-3">
              <legend className="mb-2 text-sm font-medium">{t("Quiero recibir por correo")}</legend>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="emailNotices" defaultChecked={user.emailNotices} className="mt-0.5 size-4" />
                <span>
                  <span className="block font-medium">{t("Avisos y autorizaciones de la escuela")}</span>
                  <span className="text-ink-2">{t("Además de verlos en la plataforma y en las notificaciones.")}</span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm">
                <input type="checkbox" name="emailReceipts" defaultChecked={user.emailReceipts} className="mt-0.5 size-4" />
                <span>
                  <span className="block font-medium">{t("Recibos y recordatorios de pago")}</span>
                  <span className="text-ink-2">{t("Cuando la escuela aplica un pago y antes de que venza una mensualidad.")}</span>
                </span>
              </label>
            </fieldset>
            <fieldset className="space-y-3 border-t border-line pt-4">
              <legend className="mb-2 text-sm font-medium">{t("Fotografías en la plataforma")}</legend>
              {kids.map((k) => (
                <div key={k.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>{t("¿{name} puede aparecer en fotos de su sección?", { name: k.firstName })}</span>
                  <span className="flex gap-4">
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name={`photo-${k.id}`} value="yes" defaultChecked={k.photoConsent === true} className="size-4" /> {t("Sí")}
                    </label>
                    <label className="flex items-center gap-1.5">
                      <input type="radio" name={`photo-${k.id}`} value="no" defaultChecked={k.photoConsent === false} className="size-4" /> No
                    </label>
                  </span>
                </div>
              ))}
            </fieldset>
          </ActionForm>
        </Card>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-4 text-sm text-ink-2">
        <p>
          {user.privacyAcceptedAt ? `${t("Aceptó el aviso de privacidad el {date}.", { date: dateTimeLabel(user.privacyAcceptedAt, { day: "numeric", month: "long", year: "numeric" }) })} ` : ""}
          <Link href="/privacidad" className="font-medium text-brand underline">
            {t("Ver aviso de privacidad")}
          </Link>
        </p>
        <form action={logout}>
          <button type="submit" className={buttonClass("secondary")}>
            <LogOut className="size-4" aria-hidden /> {t("Cerrar sesión")}
          </button>
        </form>
      </section>
    </div>
  );
}
