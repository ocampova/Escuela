"use client";

import { Printer } from "lucide-react";
import { buttonClass } from "./ui";

export function PrintButton({ label = "Imprimir o guardar como PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass("primary", "md", "print:hidden")}>
      <Printer className="size-4" aria-hidden /> {label}
    </button>
  );
}
