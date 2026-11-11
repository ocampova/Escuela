import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { DemoNotice } from "@/components/ui";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/logo-scs.png" alt="San Cayetano School" width={88} height={88} priority className="rounded-full" />
          <h1 className="mt-4 text-xl font-semibold">San Cayetano School</h1>
          <p className="mt-1 text-sm text-ink-2">Avisos, calendario y estado de cuenta en un solo lugar.</p>
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-card">
          <LoginForm next={next} />
        </div>
        <DemoNotice className="mt-4 text-center" />
      </div>
    </main>
  );
}
