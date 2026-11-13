"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Link2, MessageCircle } from "lucide-react";
import { createInvite, type InviteResult } from "@/app/escuela/invite-actions";
import { buttonClass, cx } from "./ui";

/** Genera el enlace de invitación y ofrece copiarlo o enviarlo por WhatsApp. */
export function InviteButton({ userId, activated, compact }: { userId: string; activated: boolean; compact?: boolean }) {
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  if (result?.link) {
    return (
      <div className="ack-in flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(result.link!);
            setCopied(true);
          }}
          className={buttonClass("secondary", "sm")}
        >
          {copied ? <Check className="size-3.5 text-ok" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
          {copied ? "Copiado" : "Copiar enlace"}
        </button>
        <a href={result.whatsapp} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
          <MessageCircle className="size-3.5" aria-hidden /> WhatsApp
        </a>
        {result.emailed && <span className="text-xs text-ok">También se envió por correo.</span>}
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setResult(await createInvite(userId)))}
        title={activated ? "Genera un enlace para que cree una contraseña nueva" : "Genera el enlace de invitación para activar la cuenta"}
        className={cx(buttonClass("secondary", "sm"), "whitespace-nowrap", compact && "px-2")}
      >
        <Link2 className="size-3.5" aria-hidden />
        {pending ? "Generando…" : activated ? "Enlace de contraseña" : "Invitar"}
      </button>
      {result?.error && <span className="text-xs text-danger">{result.error}</span>}
    </div>
  );
}
