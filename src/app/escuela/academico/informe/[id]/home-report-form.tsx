"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Plus } from "lucide-react";
import { saveHomeReport } from "../../../academico-actions";
import type { ActionState } from "@/components/action-form";
import { ACHIEVEMENTS } from "@/lib/academic";
import { GENERAL_PHRASES, phrasesFor } from "@/lib/phrases";
import { Button, buttonClass, cx, inputClass } from "@/components/ui";

const ON: Record<string, string> = {
  ok: "bg-ok text-white ring-ok",
  brand: "bg-brand text-white ring-brand",
  warn: "bg-warn text-white ring-warn",
};

type Area = { id: string; name: string; achievement: string; comment: string };
type Previous = {
  name: string;
  general: string;
  areas: Record<string, { achievement: string; comment: string }>;
} | null;

/** Agrega una frase al final del texto, con espacio. */
const append = (text: string, phrase: string) =>
  text.trim() ? `${text.trim()} ${phrase}` : phrase;

function Phrases({
  list,
  name,
  onPick,
  used,
}: {
  list: string[];
  name: string;
  onPick: (p: string) => void;
  used: string;
}) {
  return (
    <details className="group">
      <summary className="tap inline-flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-brand hover:underline">
        <Plus
          className="size-3 transition-transform group-open:rotate-45"
          aria-hidden
        />{" "}
        Frases sugeridas
      </summary>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {list.map((p) => {
          const text = p.replaceAll("{nombre}", name);
          const added = used.includes(text);
          return (
            <button
              key={p}
              type="button"
              disabled={added}
              onClick={() => onPick(text)}
              className={cx(
                "inline-flex max-w-full items-start gap-1 rounded-full px-2.5 py-1 text-left text-xs ring-1 ring-inset transition-colors",
                added
                  ? "bg-canvas text-ink-3 ring-line"
                  : "bg-surface text-ink-2 ring-line-strong hover:bg-brand-soft hover:text-brand-ink",
              )}
            >
              <Plus className="mt-0.5 size-3 shrink-0" aria-hidden />
              <span>{text}</span>
            </button>
          );
        })}
      </div>
    </details>
  );
}

export function HomeReportForm({
  studentId,
  termId,
  firstName,
  areas,
  general,
  nextHref,
  previous,
}: {
  studentId: string;
  termId: string;
  firstName: string;
  areas: Area[];
  general: string;
  nextHref: string | null;
  previous?: Previous;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    saveHomeReport,
    {},
  );
  const [ach, setAch] = useState(() =>
    Object.fromEntries(areas.map((a) => [a.id, a.achievement])),
  );
  const [com, setCom] = useState(() =>
    Object.fromEntries(areas.map((a) => [a.id, a.comment])),
  );
  const [gen, setGen] = useState(general);
  const [copied, setCopied] = useState(false);
  const goNext = useRef(false);
  const router = useRouter();
  useEffect(() => {
    if (state.ok && goNext.current && nextHref) router.push(nextHref);
  }, [state, nextHref, router]);
  const empty = areas.every((a) => !ach[a.id] && !com[a.id]) && !gen;

  const copyPrevious = () => {
    if (!previous) return;
    setAch((s) =>
      Object.fromEntries(
        areas.map((a) => [
          a.id,
          s[a.id] || previous.areas[a.id]?.achievement || "",
        ]),
      ),
    );
    setCom((s) =>
      Object.fromEntries(
        areas.map((a) => [
          a.id,
          s[a.id] || previous.areas[a.id]?.comment || "",
        ]),
      ),
    );
    setGen((g) => g || previous.general);
    setCopied(true);
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />
      <input type="hidden" name="termId" value={termId} />
      {previous && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-canvas px-3 py-2.5 text-sm">
          <span className="text-ink-2">
            {copied
              ? `Se copió el ${previous.name}. Ajuste lo que cambió y guarde.`
              : `¿Parte del informe del ${previous.name}?`}
          </span>
          {!copied && (
            <button
              type="button"
              onClick={copyPrevious}
              className="tap inline-flex items-center gap-1.5 font-medium text-brand hover:underline"
            >
              <Copy className="size-4" aria-hidden />{" "}
              {empty
                ? "Copiar del periodo anterior"
                : "Completar lo vacío con el periodo anterior"}
            </button>
          )}
        </div>
      )}
      {areas.map((a) => (
        <fieldset key={a.id} className="space-y-2.5">
          <legend className="mb-2 font-semibold">{a.name}</legend>
          <div className="flex flex-wrap gap-1.5">
            {ACHIEVEMENTS.map((o) => (
              <label key={o.value} className="cursor-pointer">
                <input
                  type="radio"
                  name={`ach-${a.id}`}
                  value={o.value}
                  checked={ach[a.id] === o.value}
                  onChange={() => setAch((s) => ({ ...s, [a.id]: o.value }))}
                  className="peer sr-only"
                />
                <span
                  className={cx(
                    "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand",
                    ach[a.id] === o.value
                      ? ON[o.tone]
                      : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
                  )}
                >
                  {o.label}
                </span>
              </label>
            ))}
          </div>
          <textarea
            name={`com-${a.id}`}
            value={com[a.id]}
            onChange={(e) => setCom((s) => ({ ...s, [a.id]: e.target.value }))}
            rows={2}
            maxLength={1500}
            aria-label={`Comentario de ${a.name}`}
            placeholder={`Qué logró ${firstName} y cómo apoyarle en casa. Toque una frase para agregarla.`}
            className={cx(inputClass, "min-h-20 [field-sizing:content]")}
          />
          <Phrases
            list={phrasesFor(a.name)}
            name={firstName}
            used={com[a.id]}
            onPick={(p) =>
              setCom((s) => ({ ...s, [a.id]: append(s[a.id], p) }))
            }
          />
        </fieldset>
      ))}
      <div className="space-y-2 border-t border-line pt-5">
        <label htmlFor="general" className="font-semibold">
          Mensaje general para la familia
        </label>
        <textarea
          id="general"
          name="general"
          value={gen}
          onChange={(e) => setGen(e.target.value)}
          rows={4}
          maxLength={2000}
          className={cx(inputClass, "min-h-24 [field-sizing:content]")}
        />
        <Phrases
          list={GENERAL_PHRASES}
          name={firstName}
          used={gen}
          onPick={(p) => setGen((g) => append(g, p))}
        />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {state.error && (
          <p role="alert" className="mr-auto text-sm text-danger">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p
            role="status"
            className="ack-in mr-auto text-sm font-medium text-ok"
          >
            {state.ok}
          </p>
        )}
        {state.ok && nextHref && (
          <Link href={nextHref} className={buttonClass("secondary")}>
            Siguiente alumno <ArrowRight className="size-4" aria-hidden />
          </Link>
        )}
        <Button
          type="submit"
          variant={nextHref ? "secondary" : "primary"}
          disabled={pending}
          onClick={() => (goNext.current = false)}
        >
          {pending && !goNext.current ? "Guardando…" : "Guardar"}
        </Button>
        {nextHref && (
          <Button
            type="submit"
            disabled={pending}
            onClick={() => (goNext.current = true)}
          >
            {pending && goNext.current
              ? "Guardando…"
              : "Guardar y seguir con el siguiente"}
          </Button>
        )}
      </div>
    </form>
  );
}
