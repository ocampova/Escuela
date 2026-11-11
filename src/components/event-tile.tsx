import { dateTimeLabel } from "@/lib/format";
import { cx } from "./ui";

const KIND_TONE: Record<string, string> = {
  pago: "bg-warn-soft text-warn",
  feriado: "bg-canvas text-ink-2 ring-1 ring-inset ring-line",
  reunion: "bg-scs-blue-soft text-scs-blue-ink",
  gira: "bg-scs-orange-soft text-scs-orange-ink",
  actividad: "bg-scs-green-soft text-scs-green-ink",
  evento: "bg-brand-soft text-brand-ink",
};

export const KIND_LABEL: Record<string, string> = {
  evento: "Evento",
  reunion: "Reunión",
  gira: "Gira",
  actividad: "Actividad",
  feriado: "Sin lecciones",
  pago: "Pago",
};

export function EventDateTile({ date, kind, className }: { date: Date; kind: string; className?: string }) {
  return (
    <span className={cx("flex size-12 shrink-0 flex-col items-center justify-center rounded-lg leading-none", KIND_TONE[kind] ?? KIND_TONE.evento, className)}>
      <span className="text-[10px] font-semibold uppercase tracking-wide">{dateTimeLabel(date, { month: "short" })}</span>
      <span className="tabular mt-0.5 text-lg font-semibold">{dateTimeLabel(date, { day: "numeric" })}</span>
    </span>
  );
}
