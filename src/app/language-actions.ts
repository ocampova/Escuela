"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { LANG_COOKIE, isLocale } from "@/lib/i18n";

/** Cambia el idioma: se guarda en la cuenta (si hay sesión) y en una cookie para las pantallas sin sesión. */
export async function setLanguage(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LANG_COOKIE, locale, { path: "/", maxAge: 365 * 86_400, sameSite: "lax" });
  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { locale } });
  revalidatePath("/", "layout");
}
