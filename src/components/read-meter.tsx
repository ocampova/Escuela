import { cx } from "./ui";

/** Barra de confirmación de lectura de un aviso. */
export function ReadMeter({ done, total, className }: { done: number; total: number; className?: string }) {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className={cx("h-full rounded-full", pct === 100 ? "bg-ok" : "bg-brand")} style={{ width: `${pct}%` }} />
      </div>
      <span className="tabular w-[112px] shrink-0 text-right text-xs text-ink-2">
        {done} de {total} familias
      </span>
    </div>
  );
}
