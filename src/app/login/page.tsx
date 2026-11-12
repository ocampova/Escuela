import Link from "next/link";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DemoNotice, isDemo } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="San Cayetano School" subtitle="Una nueva forma de aprender, crecer y descubrir." footer={
        <div className="space-y-2">
          <DemoNotice />
          <Link href="/privacidad" className="text-xs text-ink-2 underline">Aviso de privacidad</Link>
        </div>
      }>
      <LoginForm next={next} demo={isDemo()} />
    </AuthShell>
  );
}
