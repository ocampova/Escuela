"use client";

import { useTransition } from "react";
import { Languages } from "lucide-react";
import { setLanguage } from "@/app/language-actions";
import type { Locale } from "@/lib/i18n";
import { cx } from "./ui";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
];

/** Selector de idioma (Español / English). */
export function LanguageSwitch({ locale, className, tone = "light" }: { locale: Locale; className?: string; tone?: "light" | "dark" }) {
  const [pending, start] = useTransition();
  return (
    <div role="group" aria-label="Idioma / Language" className={cx("inline-flex items-center gap-1", pending && "opacity-60", className)}>
      <Languages className={cx("mr-1 size-4", tone === "dark" ? "text-white/70" : "text-ink-3")} aria-hidden />
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.value}
          aria-pressed={locale === o.value}
          disabled={pending}
          onClick={() => start(() => setLanguage(o.value))}
          className={cx(
            "h-8 rounded-lg px-2.5 text-sm font-medium transition-colors",
            locale === o.value
              ? tone === "dark" ? "bg-white/15 text-white" : "bg-brand-soft text-brand-ink"
              : tone === "dark" ? "text-white/70 hover:text-white" : "text-ink-2 hover:bg-canvas hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
