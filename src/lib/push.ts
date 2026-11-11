import "server-only";
import * as webpush from "web-push";
import { after } from "next/server";
import { prisma } from "./db";

let configured: boolean | null = null;

function configure() {
  if (configured !== null) return configured;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:scayetanoschool@gmail.com", pub, priv);
  return (configured = true);
}

export const pushEnabled = () => configure();
export const vapidPublicKey = () => process.env.VAPID_PUBLIC_KEY ?? null;

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Envía una notificación a los dispositivos de estos usuarios. Nunca lanza errores. */
export async function notify(userIds: string[], payload: PushPayload) {
  if (!configure() || userIds.length === 0) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId: { in: [...new Set(userIds)] } } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else console.warn(`[push] no se pudo enviar a ${new URL(s.endpoint).host}: ${code ?? (e as Error).message}`);
      }
    }),
  );
}

/** Envía después de responder al usuario, para no hacerlo esperar. */
export function notifyLater(userIds: string[], payload: PushPayload) {
  try {
    after(() => notify(userIds, payload).catch(() => {}));
  } catch {
    notify(userIds, payload).catch(() => {});
  }
}
