import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DemoNotice } from "@/components/ui";
import { AuthShell } from "@/components/auth-shell";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <AuthShell title="San Cayetano School" subtitle="Una nueva forma de aprender, crecer y descubrir." footer={<DemoNotice />}>
      <LoginForm next={next} />
    </AuthShell>
  );
}
