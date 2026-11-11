import "server-only";
import { randomBytes } from "node:crypto";
import { prisma } from "./db";
import { appUrl } from "./tokens";
import { eventFilter, guardianStudents, staffSections } from "./queries";

/** Devuelve (o crea) el token del calendario privado del usuario. */
export async function calendarToken(userId: string, rotate = false) {
  const u = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { calendarToken: true } });
  if (u.calendarToken && !rotate) return u.calendarToken;
  const token = randomBytes(18).toString("base64url");
  await prisma.user.update({ where: { id: userId }, data: { calendarToken: token } });
  return token;
}

export function calendarLinks(token: string) {
  const https = appUrl(`/ical/${token}`);
  const webcal = https.replace(/^https?:\/\//, "webcal://");
  return {
    https,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
/** Fecha local de Costa Rica (UTC-6, sin horario de verano) en formato AAAAMMDD */
const crDate = (d: Date, addDays = 0) => new Date(d.getTime() - 6 * 3600_000 + addDays * 86_400_000).toISOString().slice(0, 10).replace(/-/g, "");

/** Pliega líneas a 75 octetos como pide RFC 5545. */
function fold(line: string) {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = Buffer.byteLength(ch);
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += b;
  }
  out.push(cur);
  return out.join("\r\n ");
}

/** Feed ICS con los eventos que le corresponden al dueño del token. */
export async function buildCalendar(token: string) {
  const user = await prisma.user.findFirst({ where: { calendarToken: token, active: true }, include: { school: true } });
  if (!user) return null;
  const since = new Date(Date.now() - 60 * 86_400_000);
  let where;
  if (user.role === "GUARDIAN") {
    where = { schoolId: user.schoolId, startsAt: { gte: since }, ...eventFilter(await guardianStudents(user.id)) };
  } else if (user.role === "TEACHER") {
    const sections = await staffSections({ id: user.id, role: user.role, schoolId: user.schoolId } as never);
    where = {
      schoolId: user.schoolId,
      startsAt: { gte: since },
      OR: [{ audience: "SCHOOL" as const }, { levelId: { in: sections.map((s) => s.grade.levelId) } }, { sectionId: { in: sections.map((s) => s.id) } }],
    };
  } else {
    where = { schoolId: user.schoolId, startsAt: { gte: since } };
  }
  const events = await prisma.event.findMany({ where, orderBy: { startsAt: "asc" } });
  const host = new URL(appUrl("/")).hostname;
  const now = stamp(new Date());

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//San Cayetano School//Plataforma//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(user.school.name)}`,
    "X-WR-TIMEZONE:America/Costa_Rica",
    "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    "X-PUBLISHED-TTL:PT6H",
  ];
  for (const e of events) {
    lines.push("BEGIN:VEVENT", `UID:${e.id}@${host}`, `DTSTAMP:${now}`);
    if (e.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${crDate(e.startsAt)}`, `DTEND;VALUE=DATE:${crDate(e.endsAt ?? e.startsAt, 1)}`);
    } else {
      lines.push(`DTSTART:${stamp(e.startsAt)}`, `DTEND:${stamp(e.endsAt ?? new Date(e.startsAt.getTime() + 3600_000))}`);
    }
    lines.push(`SUMMARY:${esc(e.title)}`);
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`);
    lines.push(`URL:${appUrl(user.role === "GUARDIAN" ? "/familia/calendario" : "/escuela/calendario")}`, "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
