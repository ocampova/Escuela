import "server-only";
import * as webpush from "web-push";
import { after } from "next/server";
import { prisma } from "./db";

let vapid: { publicKey: string; privateKey: string } | null | undefined;

/**
 * Claves VAPID: de las variables de entorno o, si no existen, generadas una vez
 * y guardadas en la base de datos (así no hay que configurarlas al publicar).
 */
async function getVapid() {
  if (vapid !== undefined) return vapid;
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    vapid = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  } else {
    try {
      const stored = await prisma.appSetting.findUnique({ where: { key: "vapid" } });
      if (stored) vapid = JSON.parse(stored.value);
      else {
        const keys = webpush.generateVAPIDKeys();
        await prisma.appSetting.create({ data: { key: "vapid", value: JSON.stringify(keys) } }).catch(() => {});
        const saved = await prisma.appSetting.findUnique({ where: { key: "vapid" } });
        vapid = saved ? JSON.parse(saved.value) : keys;
      }
    } catch {
      vapid = null;
    }
  }
  if (vapid) webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:scayetanoschool@gmail.com", vapid.publicKey, vapid.privateKey);
  return vapid;
}

export const vapidPublicKey = async () => (await getVapid())?.publicKey ?? null;

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Envía una notificación a los dispositivos de estos usuarios. Nunca lanza errores. */
export async function notify(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0 || !(await getVapid())) return;
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
