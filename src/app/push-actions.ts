"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notify } from "@/lib/push";

const subSchema = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

export async function savePushSubscription(raw: unknown) {
  const user = await getCurrentUser();
  if (!user) return { ok: false };
  const p = subSchema.safeParse(raw);
  if (!p.success) return { ok: false };
  const ua = (await headers()).get("user-agent")?.slice(0, 200) ?? null;
  await prisma.pushSubscription.upsert({
    where: { endpoint: p.data.endpoint },
    create: { userId: user.id, endpoint: p.data.endpoint, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth, userAgent: ua },
    update: { userId: user.id, p256dh: p.data.keys.p256dh, auth: p.data.keys.auth, userAgent: ua },
  });
  await notify([user.id], { title: "Notificaciones activadas", body: "Le avisaremos de avisos, mensajes y pagos de la escuela.", url: user.role === "GUARDIAN" ? "/familia" : "/escuela" });
  return { ok: true };
}

export async function deletePushSubscription(endpoint: string) {
  const user = await getCurrentUser();
  if (!user) return;
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
}
