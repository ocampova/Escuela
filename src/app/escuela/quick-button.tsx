"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button, inputClass } from "@/components/ui";

type Result = { ok?: string; error?: string };

/** Botón de un toque para una acción rápida del día; muestra el resultado sin salir de la página. */
export function QuickButton({ run, label, pendingLabel = "Guardando…", withActivity, activity = "" }: { run: (activity?: string) => Promise<Result>; label: string; pendingLabel?: string; withActivity?: boolean; activity?: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Result | null>(null);
  const [text, setText] = useState(activity);
  if (result?.ok)
    return (
      <p role="status" className="ack-in flex items-center gap-1.5 text-sm font-medium text-ok">
        <CheckCircle2 className="size-4 shrink-0" aria-hidden /> {result.ok}
      </p>
    );
  return (
    <div className="space-y-2">
      {withActivity && (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={600}
          aria-label="Hoy trabajamos"
          placeholder="Hoy trabajamos… (opcional, lo ve toda la sección)"
          className={inputClass}
        />
      )}
      <Button size="sm" disabled={pending} onClick={() => start(async () => setResult(await run(withActivity ? text : undefined)))}>
        {pending ? pendingLabel : label}
      </Button>
      {result?.error && <p role="alert" className="text-sm text-danger">{result.error}</p>}
    </div>
  );
}
