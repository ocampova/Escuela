"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { encodeSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";

export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "");
  if (!email || !password) return { error: "Escriba su correo y su contraseña.", email };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "El correo o la contraseña no coinciden. Revise e intente de nuevo.", email };
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await encodeSession({ userId: user.id, role: user.role }), sessionCookieOptions);

  const home = user.role === "GUARDIAN" ? "/familia" : "/escuela";
  redirect(next.startsWith(home) ? next : home);
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
