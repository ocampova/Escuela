"use client";

import { translator, type Locale } from "@/lib/i18n";
import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import { cx } from "./ui";

export type BankDetails = {
  bankName: string | null;
  bankAccountHolder: string | null;
  bankHolderId: string | null;
  bankIban: string | null;
  sinpePhone: string | null;
  paymentNote: string | null;
};

/** Cuenta de la escuela para depósitos y transferencias, con botón para copiar el IBAN. */
export function BankInfo({ bank, className, locale = "es" }: { bank: BankDetails; className?: string; locale?: Locale }) {
  const t = translator(locale);
  const [copied, setCopied] = useState(false);
  if (!bank.bankIban) {
    return <p className={cx("text-sm text-ink-2", className)}>{t("La escuela todavía no ha configurado su cuenta para pagos. Consulte con Secretaría.")}</p>;
  }
  return (
    <div className={cx("space-y-3", className)}>
      <div className="flex gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
          <Landmark className="size-[18px]" aria-hidden />
        </span>
        <dl className="min-w-0 flex-1 text-sm">
          <dt className="sr-only">{t("Banco")}</dt>
          <dd className="font-medium">{bank.bankName ?? t("Cuenta bancaria")} · {t("cuenta en colones")}</dd>
          <dt className="sr-only">{t("A nombre de")}</dt>
          <dd className="text-ink-2">
            {t("A nombre de")} {bank.bankAccountHolder}
            {bank.bankHolderId ? `, ${t("cédula")} ${bank.bankHolderId}` : ""}
          </dd>
          {bank.sinpePhone && <dd className="text-ink-2">SINPE Móvil: {bank.sinpePhone}</dd>}
        </dl>
      </div>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(bank.bankIban!.replace(/\s/g, ""));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex w-full items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2.5 text-left ring-1 ring-inset ring-line transition-colors hover:bg-brand-soft"
      >
        <span className="min-w-0">
          <span className="block text-xs text-ink-2">IBAN</span>
          <span className="tabular block font-medium break-all">{bank.bankIban}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
          {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {t(copied ? "Copiado" : "Copiar")}
        </span>
      </button>
      {bank.paymentNote && <p className="text-sm text-ink-2">{bank.paymentNote}</p>}
    </div>
  );
}
