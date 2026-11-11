"use client";

import { useState, useTransition } from "react";
import { CalendarPlus, Check, Copy, RefreshCw } from "lucide-react";
import { rotateCalendarLink } from "@/app/calendar-actions";
import { buttonClass, Card } from "./ui";

type Links = { https: string; webcal: string; google: string };

/** Suscribir el calendario de la escuela en el celular (se actualiza solo). */
export function CalendarSubscribe({ links: initial, className }: { links: Links; className?: string }) {
  const [links, setLinks] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [rotated, setRotated] = useState(false);
  const [pending, start] = useTransition();

  return (
    <Card tone="flat" className={className}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-scs-blue-soft text-scs-blue-ink">
            <CalendarPlus className="size-[18px]" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">En el calendario de su celular</h2>
            <p className="mt-0.5 text-sm text-ink-2">Las actividades aparecen solas en Google Calendar o en el calendario del iPhone, y se actualizan cuando la escuela cambia algo.</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={links.webcal} className={buttonClass("primary", "sm")}>iPhone / Mac</a>
          <a href={links.google} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>Google Calendar</a>
          <button
            type="button"
            className={buttonClass("ghost", "sm")}
            onClick={async () => {
              await navigator.clipboard.writeText(links.https);
              setCopied(true);
            }}
          >
            {copied ? <Check className="size-3.5 text-ok" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? "Copiado" : "Copiar enlace"}
          </button>
        </div>
        <p className="mt-3 text-xs text-ink-3">
          El enlace es personal: no lo comparta en grupos.{" "}
          <button
            type="button"
            disabled={pending}
            className="inline-flex items-center gap-1 font-medium text-brand underline-offset-2 hover:underline"
            onClick={() =>
              start(async () => {
                setLinks(await rotateCalendarLink());
                setRotated(true);
                setCopied(false);
              })
            }
          >
            <RefreshCw className="size-3" aria-hidden />
            {pending ? "Generando…" : "Generar uno nuevo"}
          </button>
          {rotated && <span className="ml-1 text-ok">Listo: el enlace anterior ya no funciona.</span>}
        </p>
      </div>
    </Card>
  );
}
