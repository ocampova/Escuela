import { capitalize, dateLabel, keyToDate, relativeDay, todayKey } from "@/lib/format";
import { Badge } from "./ui";

/** Tarea para la casa, vista de la familia. */
export function HomeworkRow({ h }: { h: { title: string; description: string | null; dueDate: Date; subject: { name: string } | null } }) {
  const soon = h.dueDate.getTime() - keyToDate(todayKey()).getTime() <= 86_400_000;
  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{h.title}</p>
        <Badge tone={soon ? "warn" : "neutral"} className="shrink-0">{relativeDay(new Date(h.dueDate.getTime() + 18 * 3600_000))}</Badge>
      </div>
      {h.description && <p className="mt-1 text-sm whitespace-pre-line text-ink-2">{h.description}</p>}
      <p className="mt-1 text-xs text-ink-3">
        {h.subject ? `${h.subject.name} · ` : ""}Para el {capitalize(dateLabel(h.dueDate, { weekday: "long", day: "numeric", month: "long" }))}
      </p>
    </div>
  );
}
