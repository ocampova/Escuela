"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "./ui";

export function PrintButton({ label, locale = "es" }: { label?: string; locale?: "es" | "en" }) {
  label ??= locale === "en" ? "Print or save as PDF" : "Imprimir o guardar como PDF";
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "md", "print:hidden")}>
      <Printer className="size-4" aria-hidden /> {label}
    </button>
  );
}
