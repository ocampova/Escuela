"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CalendarDays, GraduationCap, Sun, ClipboardCheck, FileSpreadsheet, Inbox, LayoutGrid, MessageCircle, Settings, Users, Wallet } from "lucide-react";
import { cx } from "./ui";

type Role = "ADMIN" | "STAFF" | "TEACHER";
const ALL: Role[] = ["ADMIN", "STAFF", "TEACHER"];
const OFFICE: Role[] = ["ADMIN", "STAFF"];
const CLASSROOM: Role[] = ["ADMIN", "TEACHER"];

// Qué ve cada perfil: docs/ROLES.md
const ITEMS: { href: string; label: string; icon: typeof LayoutGrid; roles: Role[]; exact?: boolean; also?: string[] }[] = [
  { href: "/escuela", label: "Panel", icon: LayoutGrid, roles: ALL, exact: true },
  { href: "/escuela/asistencia", label: "Asistencia", icon: ClipboardCheck, roles: CLASSROOM },
  { href: "/escuela/diario", label: "Vida diaria", icon: Sun, roles: CLASSROOM, also: ["/escuela/fotos"] },
  { href: "/escuela/academico", label: "Académico", icon: GraduationCap, roles: CLASSROOM, also: ["/escuela/tareas"] },
  { href: "/escuela/mensajes", label: "Mensajes", icon: MessageCircle, roles: ALL },
  { href: "/escuela/avisos", label: "Avisos", icon: Bell, roles: ALL },
  { href: "/escuela/alumnos", label: "Alumnos", icon: Users, roles: ALL },
  { href: "/escuela/cobros", label: "Cobros", icon: Wallet, roles: OFFICE },
  { href: "/escuela/matricula", label: "Matrícula", icon: Inbox, roles: OFFICE },
  { href: "/escuela/calendario", label: "Calendario", icon: CalendarDays, roles: ALL },
  { href: "/escuela/reportes", label: "Reportes", icon: FileSpreadsheet, roles: ALL },
  { href: "/escuela/configuracion", label: "Configuración", icon: Settings, roles: OFFICE },
];

export function StaffNav({ role, variant, counts = {}, messaging = true }: { role: string; variant: "rail" | "bar"; counts?: Record<string, number>; messaging?: boolean }) {
  const path = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  // En el celular la barra se desplaza: mantener visible la sección actual
  useEffect(() => {
    if (variant !== "bar") return;
    listRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [path, variant]);
  const items = ITEMS.filter((i) => i.roles.includes(role as Role) && (messaging || i.href !== "/escuela/mensajes"));
  return (
    <nav aria-label="Principal">
      <ul ref={listRef} className={variant === "rail" ? "space-y-0.5" : "relative flex max-w-full gap-1 overflow-x-auto px-3 pb-2 [scrollbar-width:none]"}>
        {items.map((i) => {
          const active = i.exact ? path === i.href : [i.href, ...(i.also ?? [])].some((h) => path.startsWith(h));
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
