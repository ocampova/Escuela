import Image from "next/image";
import type { ReactNode } from "react";
import { BrandStripe } from "./ui";

/** Marco de las páginas públicas de acceso (entrar, activar, restablecer). */
export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh justify-center px-4 pt-12 pb-10">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[300px] bg-brand">
        <BrandStripe className="absolute inset-x-0 top-0" />
      </div>
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center text-white">
          <Image src="/logo-scs.png" alt="San Cayetano School" width={92} height={92} priority className="rounded-full bg-white ring-4 ring-white/15" />
          <h1 className="mt-4 text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
        </div>
        <div className="rounded-2xl bg-surface p-6 shadow-pop">{children}</div>
        {footer && <div className="mt-4 text-center">{footer}</div>}
      </div>
    </main>
  );
}
