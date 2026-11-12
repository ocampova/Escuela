"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { LANG_COOKIE, isLocale } from "@/lib/i18n";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  if (!email || !password) return { error: "Escriba su correo y su contraseña.", email };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.active && !user.passwordHash) {
    return { error: "Su cuenta todavía no está activada. Use el enlace de invitación que le envió la escuela.", email };
  }
  if (!user || !user.active || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "El correo o la contraseña no coinciden. Revise e intente de nuevo.", email };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await encodeSession({ userId: user.id, role: user.role }), sessionCookieOptions);
  // Idioma: si eligió uno en la pantalla de entrada, se guarda en su cuenta; si no, se usa el de la cuenta
  const lang = store.get(LANG_COOKIE)?.value;
  if (isLocale(lang) && lang !== user.locale) await prisma.user.update({ where: { id: user.id }, data: { locale: lang } });
  else store.set(LANG_COOKIE, user.locale, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });

  const home = user.role === "GUARDIAN" ? "/familia" : "/escuela";
  redirect(next.startsWith(home) ? next : home);
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
