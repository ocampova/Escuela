"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { findValidToken, issueToken, linkFor } from "@/lib/tokens";
import { mailAccessLink } from "@/lib/emails";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export type PasswordState = { error?: string };

export async function setPassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const token = String(form.get("token") ?? "");
  const password = String(form.get("password") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };
  if (password !== confirm) return { error: "Las contraseñas no coinciden." };

  const t = await findValidToken(token);
  if (!t) return { error: "El enlace venció o ya se usó. Pida uno nuevo a la escuela." };

  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    prisma.authToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
  ]);
  const store = await cookies();
  store.set(SESSION_COOKIE, await encodeSession({ userId: t.user.id, role: t.user.role }), sessionCookieOptions);
  redirect(t.user.role === "GUARDIAN" ? "/familia" : "/escuela");
}

export type ForgotState = { sent?: boolean; error?: string };

export async function requestReset(_prev: ForgotState, form: FormData): Promise<ForgotState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) return { error: "Escriba un correo válido." };
  const user = await prisma.user.findUnique({ where: { email } });
  // Misma respuesta exista o no la cuenta, para no revelar quién está registrado.
  if (user && user.active) {
    const token = await issueToken(user.id, user.passwordHash ? "RESET" : "INVITE");
    await mailAccessLink(user.email, user.name, user.passwordHash ? "RESET" : "INVITE", linkFor(user.passwordHash ? "RESET" : "INVITE", token));
  }
  return { sent: true };
}
