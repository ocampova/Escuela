"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, House, Wallet } from "lucide-react";
import { cx } from "./ui";

const TABS = [
  { href: "/familia", label: "Inicio", icon: House, exact: true },
  { href: "/familia/avisos", label: "Avisos", icon: Bell },
  { href: "/familia/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/familia/cuenta", label: "Cuenta", icon: Wallet },
];

export function FamilyTabBar({ pendingCount }: { pendingCount: number }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4">
        {TABS.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-ink-3 hover:text-ink",
                )}
              >
                <span className="relative">
                  <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                  {t.href === "/familia/avisos" && pendingCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
                      {pendingCount}
                      <span className="sr-only"> avisos pendientes</span>
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
