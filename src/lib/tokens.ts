import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { TokenPurpose } from "@prisma/client";
import { prisma } from "./db";

const TTL: Record<TokenPurpose, number> = {
  INVITE: 14 * 24 * 3600_000, // 14 días
  RESET: 2 * 3600_000, // 2 horas
};

export const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Crea un token de un solo uso y devuelve el valor en claro (solo existe en el enlace). */
export async function issueToken(userId: string, purpose: TokenPurpose) {
  const token = randomBytes(24).toString("base64url");
  await prisma.authToken.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: new Date() } });
  await prisma.authToken.create({
    data: { userId, purpose, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + TTL[purpose]) },
  });
  return token;
}

export async function findValidToken(token: string) {
  const t = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!t || t.usedAt || t.expiresAt < new Date() || !t.user.active) return null;
  return t;
}

export function appUrl(path: string) {
  const base = process.env.APP_URL ?? (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : "http://localhost:3000");
  return base.replace(/\/$/, "") + path;
}

export function linkFor(purpose: TokenPurpose, token: string) {
  return appUrl(`/${purpose === "INVITE" ? "activar" : "restablecer"}/${token}`);
}
