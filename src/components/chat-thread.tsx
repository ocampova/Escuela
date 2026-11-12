"use client";

import { translator, type Locale } from "@/lib/i18n";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { SendHorizontal } from "lucide-react";
import { sendMessage, type SendState } from "@/app/mensajes/actions";
import { cx } from "./ui";

export type ChatMessage = { id: string; body: string; mine: boolean; sender: string; time: string; day: string };

/** Hilo de mensajes con caja para escribir. Se actualiza solo cada pocos segundos. */
export function ChatThread({
  messages,
  hidden,
  placeholder,
  emptyText,
  canSend = true,
  locale = "es",
}: {
  locale?: Locale;
  messages: ChatMessage[];
  hidden: Record<string, string>;
  placeholder?: string;
  emptyText: string;
  canSend?: boolean;
}) {
  const t = translator(locale);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [state, action, pending] = useActionState<SendState, FormData>(sendMessage, {});

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (state.sentAt) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state.sentAt, router]);

  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 8000);
    return () => clearInterval(t);
  }, [router]);

  let lastDay = "";
  return (
    <div className="flex flex-col">
      <div className="space-y-2 pb-4" aria-live="polite">
        {messages.length === 0 && <p className="py-10 text-center text-sm text-ink-2">{emptyText}</p>}
        {messages.map((m) => {
          const showDay = m.day !== lastDay;
          lastDay = m.day;
          return (
            <div key={m.id}>
              {showDay && <p className="my-3 text-center text-xs font-medium text-ink-3 first-letter:uppercase">{m.day}</p>}
              <div className={cx("flex", m.mine ? "justify-end" : "justify-start")}>
                <div
                  className={cx(
                    "max-w-[82%] rounded-2xl px-3.5 py-2 text-[15px] leading-snug shadow-card",
                    m.mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-surface text-ink",
                  )}
                >
                  {!m.mine && <p className="mb-0.5 text-xs font-semibold text-brand">{m.sender}</p>}
                  <p className="whitespace-pre-line break-words">{m.body}</p>
                  <p className={cx("mt-1 text-right text-[11px]", m.mine ? "text-white/70" : "text-ink-3")}>{m.time}</p>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {canSend ? (
        <form
          ref={formRef}
          action={action}
          className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 -mx-4 border-t border-line bg-canvas/95 px-4 py-3 backdrop-blur-sm md:bottom-0 md:mx-0 md:rounded-t-xl md:border-x md:px-3"
        >
          {Object.entries(hidden).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {state.error && <p role="alert" className="mb-2 text-sm text-danger">{state.error}</p>}
          <div className="flex items-end gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">{t("Mensaje")}</span>
              <textarea
                name="body"
                required
                rows={1}
                maxLength={2000}
                placeholder={placeholder ?? t("Escriba un mensaje…")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) {
                    e.preventDefault();
                    formRef.current?.requestSubmit();
                  }
                }}
                className="block max-h-40 min-h-11 w-full resize-none rounded-2xl border-0 bg-surface px-4 py-2.5 text-[15px] ring-1 ring-inset ring-line-strong [field-sizing:content] placeholder:text-ink-3 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
            <button
              type="submit"
              disabled={pending}
              aria-label={t("Enviar")}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-[0_1px_2px_rgb(18_70_58/0.25)] transition-[background-color,transform] hover:bg-brand-hover active:scale-95 disabled:opacity-60"
            >
              <SendHorizontal className="size-5" aria-hidden />
            </button>
          </div>
        </form>
      ) : (
        <p className="rounded-xl bg-surface px-4 py-3 text-center text-sm text-ink-2 shadow-card">{t("Puede leer esta conversación, pero la responde la docente guía.")}</p>
      )}
    </div>
  );
}
