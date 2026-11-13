import Image from "next/image";
import type { ReactNode } from "react";
import { BrandStripe } from "./ui";

/** Hoja imprimible con el membrete de la escuela (recibos y estados de cuenta). */
export function PrintSheet({ title, subtitle, actions, children, school }: { title: string; subtitle?: string; actions?: ReactNode; children: ReactNode; school: { name: string; email: string | null } }) {
  return (
    <main className="min-h-dvh bg-canvas px-4 py-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-2xl flex-wrap items-center justify-between gap-3 print:hidden">{actions}</div>
      <SheetArticle title={title} subtitle={subtitle} school={school}>
        {children}
      </SheetArticle>
    </main>
  );
}

/** La hoja con membrete, sin la barra de acciones (para imprimir varias seguidas). */
export function SheetArticle({ title, subtitle, children, school, className = "" }: { title: string; subtitle?: string; children: ReactNode; school: { name: string; email: string | null }; className?: string }) {
  return (
      <article className={`${className} mx-auto max-w-2xl overflow-hidden rounded-xl bg-surface shadow-card print:max-w-none print:rounded-none print:shadow-none`}>
        <BrandStripe />
        <header className="flex items-center gap-4 border-b border-line px-4 py-5 sm:px-6">
          <Image src="/logo-scs.png" alt="" width={56} height={56} className="rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{school.name}</p>
            <p className="text-sm text-ink-2">Santa Gertrudis Norte, Grecia, Costa Rica{school.email ? ` · ${school.email}` : ""}</p>
          </div>
        </header>
        <div className="px-4 py-6 sm:px-6">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </article>
  );
}
