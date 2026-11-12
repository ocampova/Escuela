"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, House, MessageCircle, Wallet } from "lucide-react";
import { cx } from "./ui";
import { translator, type Locale } from "@/lib/i18n";

const TABS = [
  { href: "/familia", label: "Inicio", icon: House, exact: true },
  { href: "/familia/avisos", label: "Avisos", icon: Bell },
  { href: "/familia/mensajes", label: "Mensajes", icon: MessageCircle },
  { href: "/familia/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/familia/cuenta", label: "Cuenta", icon: Wallet },
];

export function FamilyTabBar({ pendingCount, unreadMessages = 0, messaging = true, locale = "es" }: { pendingCount: number; unreadMessages?: number; messaging?: boolean; locale?: Locale }) {
  const path = usePathname();
  const tr = translator(locale);
  const tabs = TABS.filter((t) => messaging || t.href !== "/familia/mensajes");
  return (
    <nav
      aria-label={tr("Secciones")}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden print:hidden"
    >
      <ul className={cx("mx-auto grid max-w-xl", tabs.length === 5 ? "grid-cols-5" : "grid-cols-4")}>
        {tabs.map((t) => {
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
                  {(() => {
                    const n = t.href === "/familia/avisos" ? pendingCount : t.href === "/familia/mensajes" ? unreadMessages : 0;
                    if (n <= 0) return null;
                    return (
                      <span className="absolute -top-1.5 -right-2.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
                        {n}
                        <span className="sr-only">{tr(t.href === "/familia/avisos" ? " avisos pendientes" : " mensajes nuevos")}</span>
                      </span>
                    );
                  })()}
                </span>
                {tr(t.label)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Navegación en el encabezado para tableta y computadora (la barra inferior se oculta). */
export function FamilyTopNav({ pendingCount, unreadMessages = 0, messaging = true, locale = "es" }: { pendingCount: number; unreadMessages?: number; messaging?: boolean; locale?: Locale }) {
  const path = usePathname();
  const tr = translator(locale);
  const tabs = TABS.filter((t) => messaging || t.href !== "/familia/mensajes");
  return (
    <nav aria-label={tr("Secciones")} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {tabs.map((t) => {
          const active = t.exact ? path === t.href : path.startsWith(t.href);
          const n = t.href === "/familia/avisos" ? pendingCount : t.href === "/familia/mensajes" ? unreadMessages : 0;
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "relative flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors duration-150",
                  active ? "bg-white/15 text-white" : "text-white/75 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {tr(t.label)}
                {n > 0 && (
                  <span className="tabular rounded-full bg-scs-orange-strong px-1.5 py-0.5 text-[10px] leading-none font-semibold text-white">
                    {n}
                    <span className="sr-only">{tr(t.href === "/familia/avisos" ? " avisos pendientes" : " mensajes nuevos")}</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
