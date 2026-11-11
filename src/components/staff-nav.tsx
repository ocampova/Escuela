"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, ClipboardCheck, Inbox, LayoutGrid, MessageCircle, Settings, Users, Wallet } from "lucide-react";
import { cx } from "./ui";

const ITEMS = [
  { href: "/escuela", label: "Panel", icon: LayoutGrid, exact: true },
  { href: "/escuela/asistencia", label: "Asistencia", icon: ClipboardCheck },
  { href: "/escuela/mensajes", label: "Mensajes", icon: MessageCircle },
  { href: "/escuela/avisos", label: "Avisos", icon: Bell },
  { href: "/escuela/alumnos", label: "Alumnos", icon: Users },
  { href: "/escuela/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/escuela/cobros", label: "Cobros", icon: Wallet, managersOnly: true },
  { href: "/escuela/matricula", label: "Matrícula", icon: Inbox, managersOnly: true },
  { href: "/escuela/configuracion", label: "Configuración", icon: Settings, managersOnly: true },
];

export function StaffNav({ manager, variant, counts = {}, messaging = true }: { manager: boolean; variant: "rail" | "bar"; counts?: Record<string, number>; messaging?: boolean }) {
  const path = usePathname();
  const items = ITEMS.filter((i) => (manager || !i.managersOnly) && (messaging || i.href !== "/escuela/mensajes"));
  return (
    <nav aria-label="Principal">
      <ul className={variant === "rail" ? "space-y-0.5" : "relative flex max-w-full gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]"}>
        {items.map((i) => {
          const active = i.exact ? path === i.href : path.startsWith(i.href);
          const Icon = i.icon;
          return (
            <li key={i.href} className="shrink-0">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                  variant === "rail" ? "h-10 px-3" : "h-9 px-3",
                  active ? "bg-white/12 text-white" : "text-white/70 hover:bg-white/8 hover:text-white",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                {i.label}
                {(counts[i.href] ?? 0) > 0 && (
                  <span className="tabular ml-auto rounded-full bg-scs-orange-strong px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white">
                    {counts[i.href]}
                    <span className="sr-only"> pendientes</span>
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
