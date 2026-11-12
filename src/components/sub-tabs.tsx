import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cx } from "./ui";

/** Pestañas secundarias dentro de una sección del panel. */
export function SubTabs({ tabs, active, label }: { tabs: { href: string; label: string; icon: LucideIcon }[]; active: string; label: string }) {
  return (
    <nav aria-label={label} className="mb-5 flex gap-1 overflow-x-auto border-b border-line [scrollbar-width:none]">
      {tabs.map((t) => {
        const on = t.href === active;
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={cx(
              "-mb-px inline-flex h-10 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
              on ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
