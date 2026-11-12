import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthShell } from "@/components/auth-shell";
import { ConsentForm } from "./consent-form";

import { i18n } from "@/lib/i18n-server";
import { LanguageSwitch } from "@/components/language-switch";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Bienvenida") };
}

export default async function WelcomePage() {
  const user = await requireGuardian();
  if (user.privacyAcceptedAt) redirect("/familia");
  const { t, locale } = await i18n();
  const kids = await prisma.student.findMany({ where: { guardians: { some: { userId: user.id } } }, select: { id: true, firstName: true, photoConsent: true }, orderBy: { birthDate: "asc" } });
  return (
    <AuthShell title={t("Hola, {name}", { name: user.name.split(" ")[0] })} subtitle={t("Un paso antes de entrar.")}>
      <LanguageSwitch locale={locale} className="-mt-2 mb-5" />
      <ConsentForm kids={kids.map((k) => ({ id: k.id, name: k.firstName, consent: k.photoConsent }))} locale={locale} />
    </AuthShell>
  );
}
