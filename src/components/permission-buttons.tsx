"use client";

import { translator, type Locale } from "@/lib/i18n";
import { useOptimistic, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { answerPermission } from "@/app/familia/avisos/permission-actions";
import { cx } from "./ui";

export function PermissionButtons({ announcementId, studentId, current, closed, locale = "es" }: { announcementId: string; studentId: string; current: "YES" | "NO" | null; closed?: boolean; locale?: Locale }) {
  const t = translator(locale);
  const [answer, setAnswer] = useOptimistic(current);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const choose = (v: "YES" | "NO") =>
    start(async () => {
      setError(null);
      setAnswer(v);
      try {
        await answerPermission(announcementId, studentId, v);
      } catch (e) {
        setError(e instanceof Error ? e.message : t("No se pudo guardar."));
      }
    });
  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["YES", "Sí, autorizo", Check, "bg-ok text-white ring-ok"],
            ["NO", "No autorizo", X, "bg-danger text-white ring-danger"],
          ] as const
        ).map(([v, label, Icon, on]) => (
          <button
            key={v}
            type="button"
            disabled={pending || closed}
            aria-pressed={answer === v}
            onClick={() => choose(v)}
            className={cx(
              "inline-flex h-12 items-center justify-center gap-2 rounded-lg text-[15px] font-medium ring-1 ring-inset transition-[background-color,transform] duration-150 active:scale-[0.98] disabled:opacity-60",
              answer === v ? on : "bg-surface text-ink ring-line-strong hover:bg-canvas",
            )}
          >
            <Icon className="size-4" aria-hidden /> {t(label)}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  );
}
