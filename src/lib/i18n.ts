import { EN } from "./i18n-en";

export type Locale = "es" | "en";
export const LOCALES: Locale[] = ["es", "en"];
export const LANG_COOKIE = "scs_lang";

export type T = (es: string, vars?: Record<string, string | number>) => string;

/**
 * Traductor por diccionario: la clave es el texto en español.
 * Si falta una traducción se muestra el español (nunca una clave vacía).
 * Variables entre llaves: t("Hola, {name}", { name }).
 */
export function translator(locale: Locale): T {
  return (es, vars) => {
    let out = locale === "en" ? (EN[es] ?? es) : es;
    if (vars) for (const [k, v] of Object.entries(vars)) out = out.replaceAll(`{${k}}`, String(v));
    return out;
  };
}

export const isLocale = (v: unknown): v is Locale => v === "es" || v === "en";

/** Número con plural simple: plural(t, n, "aviso", "avisos") */
export function plural(t: T, n: number, one: string, many: string) {
  return `${n} ${t(n === 1 ? one : many)}`;
}

const WORDS: [RegExp, string][] = [
  [/\bMensualidad\b/g, "Monthly fee"],
  [/\bMatrícula\b/g, "Enrollment"],
  [/\bMateriales\b/g, "Materials"],
  [/\bRobótica\b/g, "Robotics"],
  [/\bAbono\b/g, "Partial payment"],
  [/\bPago\b/g, "Payment"],
  [/\bde\b/g, "of"],
  ...["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"].map(
    (m, i) => [new RegExp(`\\b${m}\\b`, "gi"), ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"][i]] as [RegExp, string],
  ),
  [/\bseptiembre\b/gi, "September"],
  ...["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "set", "oct", "nov", "dic"].map(
    (m, i) => [new RegExp(`\\b${m}\\b`, "g"), ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][i]] as [RegExp, string],
  ),
];

/** Conceptos de cobro generados por la plataforma ("Mensualidad noviembre") en el idioma del usuario. */
export function conceptLabel(locale: Locale, s: string) {
  if (locale !== "en") return s;
  return WORDS.reduce((acc, [re, en]) => acc.replace(re, en), s);
}
