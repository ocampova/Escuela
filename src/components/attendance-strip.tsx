import { dateLabel } from "@/lib/format";
import { cx } from "./ui";

const COLOR: Record<string, string> = {
  PRESENT: "bg-ok",
  LATE: "bg-[#e0a43a]",
  ABSENT: "bg-danger",
  EXCUSED: "bg-line-strong",
};

export const STATUS_LABEL: Record<string, string> = {
  PRESENT: "Presente",
  LATE: "Tardía",
  ABSENT: "Ausente",
  EXCUSED: "Justificada",
};

/** Una barra por día hábil, de la más antigua a la más reciente. */
export function AttendanceStrip({ records, className }: { records: { date: Date; status: string }[]; className?: string }) {
  return (
    <div className={cx("flex items-end gap-1", className)} role="img" aria-label="Asistencia por día">
      {records.map((r) => (
        <span
          key={r.date.toISOString()}
          title={`${dateLabel(r.date, { weekday: "short", day: "numeric", month: "short" })}: ${STATUS_LABEL[r.status]}`}
          className={cx("h-8 flex-1 rounded-[3px]", COLOR[r.status])}
        />
      ))}
    </div>
  );
}
