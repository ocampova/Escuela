"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, CheckCircle2, Share, X } from "lucide-react";
import { savePushSubscription } from "@/app/push-actions";
import { Button, cx } from "./ui";

type Status = "unknown" | "unsupported" | "ios-install" | "default" | "granted" | "denied";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

function usePush(vapidKey: string | null) {
  const [status, setStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return setStatus(ios && !standalone ? "ios-install" : "unsupported");
    }
    if (Notification.permission === "granted") {
      // Asegura que la suscripción de este dispositivo esté guardada
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        if (sub) await savePushSubscription(sub.toJSON()).catch(() => {});
      });
    }
    setStatus(Notification.permission as Status);
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission as Status);
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) }));
      await savePushSubscription(sub.toJSON());
      setStatus("granted");
    } catch {
      setStatus("denied");
    } finally {
      setBusy(false);
    }
  }
  return { status, busy, enable };
}

const DISMISS_KEY = "scs-push-dismissed";

/**
 * Invitación compacta a activar las notificaciones. Va debajo de lo importante,
 * no aparece si ya están activas, bloqueadas o si la persona la cerró
 * (puede activarlas después desde su perfil).
 */
export function PushPrompt({ vapidKey, className }: { vapidKey: string | null; className?: string }) {
  const { status, busy, enable } = usePush(vapidKey);
  const [dismissed, setDismissed] = useState(true);
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);
  if (!vapidKey || dismissed || (status !== "default" && status !== "ios-install")) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className={cx("ack-in flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 shadow-card", className)}>
      <BellRing className="size-5 shrink-0 text-brand" aria-hidden />
      <p className="min-w-0 flex-1 text-sm text-ink-2">
        {status === "ios-install" ? (
          <>
            Para recibir avisos en el iPhone: toque <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> y «Agregar a pantalla de inicio».
          </>
        ) : (
          "Reciba al instante avisos, mensajes y pagos."
        )}
      </p>
      {status === "default" && (
        <Button size="sm" className="shrink-0" onClick={enable} disabled={busy}>
          {busy ? "Activando…" : "Activar"}
        </Button>
      )}
      <button type="button" onClick={dismiss} aria-label="Ahora no" className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-3 hover:bg-canvas">
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Estado de las notificaciones en este dispositivo, para la página de perfil. */
export function PushSettings({ vapidKey }: { vapidKey: string | null }) {
  const { status, busy, enable } = usePush(vapidKey);
  if (!vapidKey || status === "unknown") return null;
  const row = (icon: React.ReactNode, title: string, text: React.ReactNode, action?: React.ReactNode) => (
    <div className="flex flex-wrap items-center gap-3">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-ink-2">{text}</p>
      </div>
      {action}
    </div>
  );
  if (status === "granted") return row(<CheckCircle2 className="size-5 shrink-0 text-ok" aria-hidden />, "Activadas en este dispositivo", "Le avisamos al instante de avisos, mensajes y pagos.");
  if (status === "denied")
    return row(<BellOff className="size-5 shrink-0 text-ink-3" aria-hidden />, "Bloqueadas en este navegador", "Para recibirlas, permítalas en la configuración del navegador para este sitio.");
  if (status === "ios-install")
    return row(
      <BellRing className="size-5 shrink-0 text-brand" aria-hidden />,
      "Disponibles al instalar la app",
      <>
        Toque <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> y «Agregar a pantalla de inicio»; abra la app desde ahí.
      </>,
    );
  if (status === "unsupported") return row(<BellOff className="size-5 shrink-0 text-ink-3" aria-hidden />, "No disponibles en este navegador", "Pruebe desde Chrome o Safari en su celular.");
  return row(
    <BellRing className="size-5 shrink-0 text-brand" aria-hidden />,
    "Notificaciones apagadas",
    "Reciba al instante avisos, mensajes y pagos.",
    <Button size="sm" onClick={enable} disabled={busy}>
      {busy ? "Activando…" : "Activar"}
    </Button>,
  );
}
