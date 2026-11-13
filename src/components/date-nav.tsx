"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "./ui";

const shift = (key: string, days: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const LABEL = new Intl.DateTimeFormat("es-CR", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const SHORT = new Intl.DateTimeFormat("es-CR", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

/**
 * Día anterior / siguiente y la fecha en texto. Al tocar la fecha se abre el calendario
 * del teléfono (un campo de fecha invisible encima), así el control se ve igual en
 * iPhone, Android y computadora. Conserva los demás parámetros de la página.
 */
export function DateNav({ path, params, value, max, className }: { path: string; params: Record<string, string | undefined>; value: string; max: string; className?: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const go = (fecha: string) => {
    if (!fecha || fecha > max) return;
    const q = new URLSearchParams(Object.entries({ ...params, fecha }).filter((e): e is [string, string] => !!e[1]));
    router.push(`${path}?${q}`);
  };
  const label = LABEL.format(new Date(`${value}T12:00:00Z`)).replace(/^./, (c) => c.toUpperCase());
  const isToday = value === max;
  const short = SHORT.format(new Date(`${value}T12:00:00Z`)).replace(/[.,]/g, "");
  const arrow = "grid size-9 shrink-0 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-canvas hover:text-ink disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className={cx("-ml-2 flex max-w-full items-center gap-0.5", className)}>
      <button type="button" className={arrow} onClick={() => go(shift(value, -1))} aria-label="Día anterior">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <label className="relative inline-flex h-9 min-w-0 shrink cursor-pointer items-center gap-1.5 rounded-lg px-2 text-sm text-ink-2 transition-colors hover:bg-canvas hover:text-ink">
        <CalendarDays className="size-4 shrink-0" aria-hidden />
        {/* Corta en celulares angostos, completa desde 400 px */}
        <span className="truncate min-[400px]:hidden">
          {isToday && <span className="font-medium text-brand">Hoy, </span>}
          {short}
        </span>
        <span className="hidden truncate min-[400px]:inline">
          {label}
          {isToday && <span className="ml-1.5 font-medium text-brand">· Hoy</span>}
        </span>
        <input
          ref={input}
          type="date"
          value={value}
          max={max}
          onChange={(e) => go(e.target.value)}
          onClick={() => {
            try {
              input.current?.showPicker?.();
            } catch {}
          }}
          aria-label="Elegir fecha"
          className="absolute inset-0 min-h-0 w-full cursor-pointer opacity-0"
        />
      </label>
      <button type="button" className={arrow} onClick={() => go(shift(value, 1))} disabled={isToday} aria-label="Día siguiente">
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
