import Image from "next/image";
import type { ReactNode } from "react";
import { BrandStripe } from "./ui";

/** Marco de las páginas públicas amplias (matrícula). */
export function PublicShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="relative min-h-dvh px-4 pt-10 pb-16">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[320px] bg-brand">
        <BrandStripe className="absolute inset-x-0 top-0" />
      </div>
      <div className="relative mx-auto w-full max-w-2xl">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Image src="/logo-scs.png" alt="San Cayetano School" width={84} height={84} priority className="rounded-full bg-white ring-4 ring-white/15" />
          <h1 className="mt-4 text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1.5 max-w-md text-sm text-white/80">{subtitle}</p>}
        </div>
        <div className="rounded-2xl bg-surface p-5 shadow-pop sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-ink-3">San Cayetano School · Santa Gertrudis Norte, Grecia, Costa Rica</p>
      </div>
    </main>
  );
}
