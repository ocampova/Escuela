"use client";

import { useEffect, useState } from "react";
import { BellRing, Share, X } from "lucide-react";
import { savePushSubscription } from "@/app/push-actions";
import { Button, cx } from "./ui";

type Status = "unknown" | "unsupported" | "ios-install" | "default" | "granted" | "denied" | "dismissed";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Tarjeta para activar las notificaciones push en este dispositivo. */
export function PushPrompt({ vapidKey, tone = "light", className }: { vapidKey: string | null; tone?: "light" | "dark"; className?: string }) {
  const [status, setStatus] = useState<Status>("unknown");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem("scs-push-dismissed") === "1") return setStatus("dismissed");
    } catch {}
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

  if (!vapidKey || ["unknown", "unsupported", "granted", "dismissed"].includes(status)) return null;

  const dismiss = () => {
    try {
      localStorage.setItem("scs-push-dismissed", "1");
    } catch {}
    setStatus("dismissed");
  };

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

  const dark = tone === "dark";
  return (
    <div className={cx("relative flex gap-3 rounded-xl p-4", dark ? "bg-white/10 text-white" : "bg-surface shadow-card", className)}>
      <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", dark ? "bg-white/15" : "bg-brand-soft text-brand")}>
        <BellRing className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 pr-6">
        {status === "ios-install" ? (
          <>
            <p className="font-medium">Reciba avisos en su iPhone</p>
            <p className={cx("mt-0.5 text-sm", dark ? "text-white/75" : "text-ink-2")}>
              Toque <Share className="inline size-4 align-text-bottom" aria-label="Compartir" /> y luego «Agregar a pantalla de inicio». Abra la app desde ahí para activar las notificaciones.
            </p>
          </>
        ) : status === "denied" ? (
          <>
            <p className="font-medium">Notificaciones bloqueadas</p>
            <p className={cx("mt-0.5 text-sm", dark ? "text-white/75" : "text-ink-2")}>Para recibirlas, permítalas en la configuración del navegador para este sitio.</p>
          </>
        ) : (
          <>
            <p className="font-medium">Active las notificaciones</p>
            <p className={cx("mt-0.5 text-sm", dark ? "text-white/75" : "text-ink-2")}>Le avisamos al instante de avisos, mensajes y pagos.</p>
            <Button size="sm" className={cx("mt-3", dark && "bg-white text-brand hover:bg-white/90")} onClick={enable} disabled={busy}>
              {busy ? "Activando…" : "Activar"}
            </Button>
          </>
        )}
      </div>
      <button type="button" onClick={dismiss} aria-label="Cerrar" className={cx("absolute top-2 right-2 flex size-8 items-center justify-center rounded-lg", dark ? "text-white/70 hover:bg-white/10" : "text-ink-3 hover:bg-canvas")}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
