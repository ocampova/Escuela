import { NotebookPen } from "lucide-react";
import { DAILY_FIELDS, dailyLabel } from "@/lib/daily";
import { cx } from "./ui";

type Report = { day: Date; mood: string | null; meal: string | null; participation: string | null; bathroom: string | null; note: string | null; activity: string | null };

const toneClass = { ok: "bg-ok-soft text-ok", warn: "bg-warn-soft text-warn" } as const;

/** Reporte del día para la familia: chips con lo que marcó la docente + actividad y nota. */
export function DailyReportView({ report, compact }: { report: Report; compact?: boolean }) {
  return (
    <div className="space-y-3">
      {report.activity && !compact && (
        <p className="text-sm">
          <span className="font-medium">Hoy trabajamos: </span>
          <span className="text-ink-2">{report.activity}</span>
        </p>
      )}
      <dl className={cx("grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4")}>
        {DAILY_FIELDS.map((f) => {
          const o = dailyLabel(f.key, report[f.key]);
          if (!o) return null;
          return (
            <div key={f.key} className={cx("rounded-lg px-3 py-2", toneClass[o.tone])}>
              <dt className="text-[11px] font-medium tracking-wide uppercase opacity-80">{f.label}</dt>
              <dd className="text-sm font-semibold">{o.label}</dd>
            </div>
          );
        })}
      </dl>
      {report.note && (
        <p className="flex gap-2 rounded-lg bg-canvas px-3 py-2 text-sm text-ink-2">
          <NotebookPen className="mt-0.5 size-4 shrink-0 text-ink-3" aria-hidden />
          {report.note}
        </p>
      )}
    </div>
  );
}
