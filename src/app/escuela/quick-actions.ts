"use server";

import { prisma } from "@/lib/db";
import { todayKey, keyToDate } from "@/lib/format";
import { DAILY_DEFAULTS, DAILY_FIELDS } from "@/lib/daily";
import { saveAttendance } from "./actions";
import { saveDailyReports } from "./vida-actions";

type Result = { ok?: string; error?: string };

/**
 * Pasar lista en un toque: todos presentes, salvo las ausencias y llegadas tarde
 * que avisaron las familias. Usa la misma validación que la pantalla de asistencia.
 */
export async function quickAttendance(sectionId: string): Promise<Result> {
  const day = keyToDate(todayKey());
  const students = await prisma.student.findMany({
    where: { sectionId, status: "ACTIVE" },
    include: { absenceNotices: { where: { dateFrom: { lte: day }, dateTo: { gte: day } }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const f = new FormData();
  f.set("sectionId", sectionId);
  f.set("date", todayKey());
  let noticed = 0;
  for (const s of students) {
    const n = s.absenceNotices[0];
    if (n) noticed++;
    f.set(`status-${s.id}`, n ? (n.reason === "Llegará tarde" ? "LATE" : "EXCUSED") : "PRESENT");
    if (n) f.set(`note-${s.id}`, `${n.reason}${n.note ? `: ${n.note}` : ""} (avisado por la familia)`);
  }
  const r = await saveAttendance({}, f);
  if (r.error) return r;
  return { ok: noticed ? `Lista guardada: ${students.length - noticed} presentes y ${noticed} con aviso de la familia.` : `Lista guardada: los ${students.length} presentes.` };
}

/** Reporte diario en un toque: lo habitual para todos los presentes, sin tocar lo que ya se llenó. */
export async function quickDaily(sectionId: string, activityText?: string): Promise<Result> {
  const day = keyToDate(todayKey());
  const students = await prisma.student.findMany({
    where: { sectionId, status: "ACTIVE" },
    include: { dailyReports: { where: { day } }, attendance: { where: { date: day } } },
  });
  const f = new FormData();
  f.set("sectionId", sectionId);
  f.set("date", todayKey());
  f.set("send", "1");
  const activity = activityText?.trim() || students.flatMap((s) => s.dailyReports).find((r) => r.activity)?.activity;
  if (activity) f.set("activity", activity);
  for (const s of students) {
    const absent = s.attendance[0]?.status === "ABSENT" || s.attendance[0]?.status === "EXCUSED";
    const r = s.dailyReports[0];
    if (absent && !r) continue;
    for (const field of DAILY_FIELDS) {
      const current = r?.[field.key as keyof typeof r] as string | null | undefined;
      f.set(`${field.key}-${s.id}`, current ?? (absent ? "" : DAILY_DEFAULTS[field.key]));
    }
    if (r?.note) f.set(`note-${s.id}`, r.note);
  }
  return saveDailyReports({}, f);
}
