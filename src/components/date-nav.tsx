"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "./ui";

const shift = (key: string, days: number) => {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/**
 * Cambiar de día sin botón "Ver": flechas para el día anterior y el siguiente,
 * y la fecha se aplica al elegirla. Conserva los demás parámetros de la página.
 */
export function DateNav({ path, params, value, max, className }: { path: string; params: Record<string, string | undefined>; value: string; max: string; className?: string }) {
  const router = useRouter();
  const go = (fecha: string) => {
    if (!fecha || fecha > max) return;
    const q = new URLSearchParams(Object.entries({ ...params, fecha }).filter((e): e is [string, string] => !!e[1]));
    router.push(`${path}?${q}`);
  };
  const btn = "grid size-10 shrink-0 place-items-center rounded-lg text-ink-2 ring-1 ring-inset ring-line-strong transition-colors hover:bg-canvas disabled:opacity-40";
  return (
    <div className={cx("flex items-center gap-1.5", className)}>
      <button type="button" className={btn} onClick={() => go(shift(value, -1))} aria-label="Día anterior">
        <ChevronLeft className="size-4" aria-hidden />
      </button>
      <label className="min-w-0">
        <span className="sr-only">Fecha</span>
        <input
          type="date"
          value={value}
          max={max}
          onChange={(e) => go(e.target.value)}
          className="block h-10 min-h-0 w-[9.75rem] rounded-lg bg-surface px-3 text-[15px] ring-1 ring-inset ring-line-strong focus:outline-none focus:ring-2 focus:ring-brand"
        />
      </label>
      <button type="button" className={btn} onClick={() => go(shift(value, 1))} disabled={value >= max} aria-label="Día siguiente">
        <ChevronRight className="size-4" aria-hidden />
      </button>
    </div>
  );
}
