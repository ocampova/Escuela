"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { acknowledge } from "@/app/familia/actions";
import { cx } from "./ui";

export function AckButton({ id, acknowledged, size = "md", className }: { id: string; acknowledged: boolean; size?: "md" | "lg"; className?: string }) {
  const [done, setDone] = useOptimistic(acknowledged);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span className={cx("ack-in inline-flex items-center gap-1.5 font-medium text-ok", size === "lg" ? "h-12 text-base" : "h-9 text-sm", className)}>
        <Check className="size-4" strokeWidth={2.5} aria-hidden />
        Enterado
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          setDone(true);
          await acknowledge(id);
        })
      }
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand font-medium text-white shadow-[0_1px_2px_rgb(18_70_58/0.25)] transition-[background-color,transform] duration-150 hover:bg-brand-hover active:scale-[0.97] disabled:opacity-60",
        size === "lg" ? "h-12 w-full px-5 text-base" : "h-9 px-3.5 text-sm",
        className,
      )}
    >
      <Check className="size-4" strokeWidth={2.5} aria-hidden />
      Enterado
    </button>
  );
}
