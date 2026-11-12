import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getCurrentUser } from "./auth";
import { formatLocale } from "./format";
import { LANG_COOKIE, isLocale, translator, type Locale } from "./i18n";

/** Idioma de esta petición: el del usuario, o la cookie (pantallas sin sesión). */
export const getLocale = cache(async (): Promise<Locale> => {
  const user = await getCurrentUser();
  if (user && isLocale(user.locale)) return user.locale;
  const c = (await cookies()).get(LANG_COOKIE)?.value;
  return isLocale(c) ? c : "es";
});

/** Llamar al inicio de cada página: fija el idioma de las fechas y devuelve el traductor. */
export async function i18n() {
  const locale = await getLocale();
  formatLocale().current = locale;
  return { locale, t: translator(locale) };
}
