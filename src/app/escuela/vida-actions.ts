"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import { keyToDate, timeLabel, todayKey } from "@/lib/format";
import { notifyLater } from "@/lib/push";
import { DAILY_FIELDS, isValidDaily } from "@/lib/daily";

export type FormState = { error?: string; ok?: string };

async function assertSection(sectionId: string) {
  const user = await requireStaff();
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) },
    include: { grade: true },
  });
  if (!section) throw new Error("No tiene acceso a esta sección");
  return { user, section };
}

/* ---------- Reporte diario ---------- */

export async function saveDailyReports(_prev: FormState, form: FormData): Promise<FormState> {
  const sectionId = String(form.get("sectionId"));
  const date = String(form.get("date"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > todayKey()) return { error: "Fecha no válida." };
  const send = form.get("send") === "1";
  const { user } = await assertSection(sectionId);
  const day = keyToDate(date);
  const activity = String(form.get("activity") ?? "").trim().slice(0, 600) || null;
  const students = await prisma.student.findMany({
    where: { sectionId },
    include: { guardians: { select: { userId: true } }, dailyReports: { where: { day } } },
  });

  const toNotify: { id: string; name: string; guardians: string[] }[] = [];
  let saved = 0;
  for (const s of students) {
    const data: Record<string, string | null> = {};
    for (const f of DAILY_FIELDS) {
      const v = String(form.get(`${f.key}-${s.id}`) ?? "");
      data[f.key] = v && isValidDaily(f.key, v) ? v : null;
    }
    const note = String(form.get(`note-${s.id}`) ?? "").trim().slice(0, 500) || null;
    const empty = Object.values(data).every((v) => !v) && !note;
    const existing = s.dailyReports[0];
    if (empty && !existing) continue;
    const sentAt = existing?.sentAt ?? (send && !empty ? new Date() : null);
    await prisma.dailyReport.upsert({
      where: { studentId_day: { studentId: s.id, day } },
      create: { studentId: s.id, day, ...data, note, activity, authorId: user.id, sentAt },
      update: { ...data, note, activity, authorId: user.id, sentAt },
    });
    saved++;
    if (send && !empty && !existing?.sentAt) toNotify.push({ id: s.id, name: s.firstName, guardians: s.guardians.map((g) => g.userId) });
  }

  for (const s of toNotify) {
    notifyLater(s.guardians, { title: `Así le fue a ${s.name} hoy`, body: "La docente compartió el reporte del día.", url: `/familia/hijos/${s.id}`, tag: `diario-${s.id}-${date}` });
  }
  revalidatePath("/escuela/diario");
  revalidatePath("/familia", "layout");
  if (saved === 0) return { error: "No hay nada que guardar todavía." };
  if (send) return { ok: toNotify.length ? `Enviado a ${toNotify.length} ${toNotify.length === 1 ? "familia" : "familias"}.` : "Cambios guardados. Las familias ya tenían el reporte." };
  return { ok: "Borrador guardado. Las familias lo verán cuando lo envíe." };
}

/* ---------- Fotos ---------- */

const MAX_PHOTOS = 40;
const MAX_BYTES = 4 * 1024 * 1024;

export async function createAlbum(_prev: FormState, form: FormData): Promise<FormState> {
  const sectionId = String(form.get("sectionId") ?? "");
  const { user, section } = await assertSection(sectionId);
  const date = String(form.get("date") ?? todayKey());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length === 0) return { error: "Elija al menos una foto." };
  if (files.length > MAX_PHOTOS) return { error: `Máximo ${MAX_PHOTOS} fotos por álbum.` };
  if (files.some((f) => !/^image\/(jpeg|png|webp)$/.test(f.type))) return { error: "Solo se aceptan fotos (JPG, PNG o WebP)." };
  if (files.some((f) => f.size > MAX_BYTES)) return { error: "Alguna foto es muy pesada (máximo 4 MB)." };
  const noConsent = await prisma.student.count({ where: { sectionId, photoConsent: { not: true } } });
  if (noConsent > 0 && form.get("consentChecked") !== "on") return { error: "Confirme que revisó que no aparezcan los niños sin autorización." };

  const title = String(form.get("title") ?? "").trim().slice(0, 100) || `Fotos de ${section.grade.name} ${section.name}`;
  const album = await prisma.album.create({
    data: {
      sectionId,
      title,
      day: keyToDate(date),
      authorId: user.id,
      photos: { create: await Promise.all(files.map(async (f, i) => ({ mimeType: f.type, size: f.size, data: new Uint8Array(await f.arrayBuffer()), order: i }))) },
    },
  });
  const guardians = await prisma.studentGuardian.findMany({ where: { student: { sectionId } }, select: { userId: true } });
  notifyLater(guardians.map((g) => g.userId), { title: `Nuevas fotos: ${title}`, body: `${files.length} ${files.length === 1 ? "foto" : "fotos"} de ${section.grade.name} ${section.name}.`, url: `/familia/fotos/${album.id}`, tag: `album-${album.id}` });
  revalidatePath("/escuela/fotos");
  revalidatePath("/familia", "layout");
  redirect(`/escuela/fotos/${album.id}?nuevo=1`);
}

export async function deleteAlbum(id: string) {
  const user = await requireStaff();
  const album = await prisma.album.findFirst({ where: { id, section: { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) } } });
  if (!album) throw new Error("No encontrado");
  await prisma.album.delete({ where: { id } });
  revalidatePath("/escuela/fotos");
  revalidatePath("/familia", "layout");
  redirect("/escuela/fotos");
}

export async function deletePhoto(id: string) {
  const user = await requireStaff();
  const photo = await prisma.albumPhoto.findFirst({ where: { id, album: { section: { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) } } } });
  if (!photo) throw new Error("No encontrado");
  await prisma.albumPhoto.delete({ where: { id } });
  revalidatePath(`/escuela/fotos/${photo.albumId}`);
}

/* ---------- Salida ---------- */

export async function registerPickup(_prev: FormState, form: FormData): Promise<FormState> {
  const studentId = String(form.get("studentId") ?? "");
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { pickups: true, guardians: { include: { user: { select: { id: true, name: true } } } } },
  });
  if (!student) return { error: "Alumno no encontrado." };
  const { user } = await assertSection(student.sectionId);
  const who = String(form.get("who") ?? "");
  let personName: string, relation: string | null, kind: string;
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;

  if (who.startsWith("g:")) {
    const g = student.guardians.find((x) => x.userId === who.slice(2));
    if (!g) return { error: "Elija quién lo recoge." };
    [personName, relation, kind] = [g.user.name, g.relationship, "GUARDIAN"];
  } else if (who.startsWith("a:")) {
    const p = student.pickups.find((x) => x.id === who.slice(2));
    if (!p) return { error: "Elija quién lo recoge." };
    [personName, relation, kind] = [p.name, p.relationship, "AUTHORIZED"];
  } else if (who === "other") {
    personName = String(form.get("otherName") ?? "").trim().slice(0, 120);
    if (!personName) return { error: "Escriba el nombre de la persona." };
    if (!note) return { error: "Anote cómo se confirmó con la familia (por ejemplo: llamada a la mamá)." };
    [relation, kind] = [String(form.get("otherRelation") ?? "").trim().slice(0, 60) || null, "OTHER"];
  } else {
    return { error: "Elija quién lo recoge." };
  }

  const day = keyToDate(todayKey());
  const at = new Date();
  await prisma.pickupLog.upsert({
    where: { studentId_day: { studentId, day } },
    create: { studentId, day, at, personName, relation, kind, note, staffId: user.id },
    update: { at, personName, relation, kind, note, staffId: user.id },
  });
  const who2 = `${personName}${relation ? ` (${relation.toLowerCase()})` : ""}`;
  notifyLater(student.guardians.map((g) => g.userId), {
    title: kind === "OTHER" ? `${student.firstName} salió con una persona fuera de la lista` : `${student.firstName} ya salió de la escuela`,
    body: `Lo recogió ${who2} a las ${timeLabel(at)}.${kind === "OTHER" ? " Si no lo autorizó, llame a la escuela." : ""}`,
    url: `/familia/hijos/${studentId}`,
    tag: `salida-${studentId}`,
  });
  revalidatePath("/escuela/salida");
  revalidatePath("/familia", "layout");
  return { ok: `Salida registrada: ${who2}.` };
}

export async function undoPickup(id: string) {
  const user = await requireStaff();
  const log = await prisma.pickupLog.findFirst({ where: { id, student: { section: { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) } } } });
  if (!log) throw new Error("No encontrado");
  await prisma.pickupLog.delete({ where: { id } });
  revalidatePath("/escuela/salida");
  revalidatePath("/familia", "layout");
}
