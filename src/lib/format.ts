const TZ = "America/Costa_Rica";

export function crc(amount: number) {
  return "₡" + new Intl.NumberFormat("es-CR", { maximumFractionDigits: 0 }).format(amount).replace(/ | /g, " ");
}

export function usd(amount: number) {
  return "US$" + new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount);
}

/** Monto con su moneda (colones o dólares). */
export function money(amount: number, currency: string = "CRC") {
  return currency === "USD" ? usd(amount) : crc(amount);
}

export function fullName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const fmt = (opts: Intl.DateTimeFormatOptions, utc = false) =>
  new Intl.DateTimeFormat("es-CR", { timeZone: utc ? "UTC" : TZ, ...opts });

/** Fechas guardadas como @db.Date (medianoche UTC) */
export function dateLabel(d: Date, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }) {
  return fmt(opts, true).format(d).replace(".", "");
}

export function dateTimeLabel(d: Date, opts: Intl.DateTimeFormatOptions) {
  return fmt(opts).format(d).replace(".", "");
}

export function timeLabel(d: Date) {
  return fmt({ hour: "numeric", minute: "2-digit", hour12: true }).format(d).replace(/\s?([ap])\.?\s?m\.?/i, " $1. m.");
}

export function relativeDay(d: Date) {
  const today = todayKey();
  const key = dayKey(d);
  const diff = Math.round((Date.parse(key) - Date.parse(today)) / 86400000);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) return capitalize(dateTimeLabel(d, { weekday: "long" }));
  return dateTimeLabel(d, { day: "numeric", month: "short" });
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** YYYY-MM-DD en hora de Costa Rica */
export function dayKey(d: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d);
}

export function todayKey() {
  return dayKey(new Date());
}

/** Convierte YYYY-MM-DD a Date UTC para columnas @db.Date */
export function keyToDate(key: string) {
  return new Date(`${key}T00:00:00.000Z`);
}

export function gradeSectionName(s: { name: string; grade: { name: string } }) {
  return `${s.grade.name} ${s.name}`;
}
