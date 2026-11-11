import Image from "next/image";
import type { Metadata } from "next";
import { LoginForm } from "./login-form";
import { BrandStripe, DemoNotice } from "@/components/ui";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="relative flex min-h-dvh justify-center px-4 pt-12 pb-10">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[300px] bg-brand">
        <BrandStripe className="absolute inset-x-0 top-0" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Image src="/logo-scs.png" alt="San Cayetano School" width={92} height={92} priority className="rounded-full bg-white ring-4 ring-white/15" />
          <h1 className="mt-4 text-xl font-semibold">San Cayetano School</h1>
          <p className="mt-1 text-sm text-white/80">Una nueva forma de aprender, crecer y descubrir.</p>
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-pop">
          <LoginForm next={next} />
        </div>
        <DemoNotice className="mt-4 text-center" />
      </div>
    </main>
  );
}
