import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DemoNotice, isDemo } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

import { i18n } from "@/lib/i18n-server";
import { LanguageSwitch } from "@/components/language-switch";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Entrar") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const { t, locale } = await i18n();
  return (
    <AuthShell title={t("San Cayetano School")} subtitle={t("Una nueva forma de aprender, crecer y descubrir.")} footer={
        <div className="space-y-2">
          <DemoNotice locale={locale} />
          <Link href="/privacidad" className="text-xs text-ink-2 underline">{t("Aviso de privacidad")}</Link>
          <LanguageSwitch locale={locale} className="mt-2" />
        </div>
      }>
      <LoginForm next={next} demo={isDemo()} locale={locale} />
    </AuthShell>
  );
}
