"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AttendanceStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import { keyToDate } from "@/lib/format";

export type FormState = { error?: string; ok?: string };

async function assertSection(sectionId: string) {
  const user = await requireStaff();
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) },
  });
  if (!section) throw new Error("No tiene acceso a esta sección");
  return { user, section };
}

/* ---------- Asistencia ---------- */

const STATUSES = ["PRESENT", "LATE", "ABSENT", "EXCUSED"] as const;

export async function saveAttendance(_prev: FormState, form: FormData): Promise<FormState> {
  const sectionId = String(form.get("sectionId"));
  const date = String(form.get("date"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Fecha no válida." };
  const { user } = await assertSection(sectionId);
  const students = await prisma.student.findMany({ where: { sectionId }, select: { id: true } });
  const d = keyToDate(date);
  let missing = 0;
  await prisma.$transaction(
    students.flatMap((s) => {
      const status = String(form.get(`status-${s.id}`) ?? "");
      if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
        missing++;
        return [];
      }
      const note = String(form.get(`note-${s.id}`) ?? "").trim() || null;
      return [
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: s.id, date: d } },
          create: { studentId: s.id, date: d, status: status as AttendanceStatus, note, recordedById: user.id },
          update: { status: status as AttendanceStatus, note, recordedById: user.id },
        }),
      ];
    }),
  );
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
  if (missing > 0) return { ok: `Lista guardada. ${missing} ${missing === 1 ? "alumno quedó" : "alumnos quedaron"} sin marcar.` };
  return { ok: "Lista guardada. Las familias ya pueden verla." };
}

/* ---------- Avisos ---------- */

const announcementSchema = z.object({
  title: z.string().trim().min(3, "Escriba un título de al menos 3 letras.").max(120),
  body: z.string().trim().min(10, "El mensaje es muy corto.").max(5000),
  target: z.string().min(1, "Elija a quién va dirigido."),
  requiresAck: z.boolean(),
});

export async function createAnnouncement(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  const parsed = announcementSchema.safeParse({
    title: form.get("title"),
    body: form.get("body"),
    target: form.get("target"),
    requiresAck: form.get("requiresAck") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, body, target, requiresAck } = parsed.data;

  let audience: "SCHOOL" | "LEVEL" | "SECTION" = "SCHOOL";
  let levelId: string | undefined;
  let sectionId: string | undefined;
  if (target.startsWith("level:")) {
    if (!isManager(user)) return { error: "Solo Dirección puede enviar avisos a un nivel completo." };
    audience = "LEVEL";
    levelId = target.slice(6);
    const level = await prisma.level.findFirst({ where: { id: levelId, schoolId: user.schoolId } });
    if (!level) return { error: "Nivel no encontrado." };
  } else if (target.startsWith("section:")) {
    audience = "SECTION";
    sectionId = target.slice(8);
    await assertSection(sectionId);
  } else if (!isManager(user)) {
    return { error: "Solo Dirección puede enviar avisos a toda la escuela." };
  }

  const a = await prisma.announcement.create({
    data: { schoolId: user.schoolId, authorId: user.id, title, body, audience, levelId, sectionId, requiresAck },
  });
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
  redirect(`/escuela/avisos/${a.id}?enviado=1`);
}

/* ---------- Calendario ---------- */

const eventSchema = z.object({
  title: z.string().trim().min(3, "Escriba un título.").max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elija una fecha."),
  time: z.string().regex(/^(\d{2}:\d{2})?$/),
  kind: z.enum(["evento", "reunion", "gira", "actividad", "feriado", "pago"]),
  description: z.string().trim().max(500).optional(),
  target: z.string().min(1),
});

export async function createEvent(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { title, date, time, kind, description, target } = parsed.data;

  let audience: "SCHOOL" | "LEVEL" | "SECTION" = "SCHOOL";
  let levelId: string | undefined;
  let sectionId: string | undefined;
  if (target.startsWith("level:")) {
    audience = "LEVEL";
    levelId = target.slice(6);
  } else if (target.startsWith("section:")) {
    audience = "SECTION";
    sectionId = target.slice(8);
    await assertSection(sectionId);
  }
  if (!isManager(user) && audience !== "SECTION") return { error: "Como docente, puede agendar eventos solo para sus secciones." };

  // Hora local de Costa Rica (UTC-6, sin horario de verano)
  const startsAt = new Date(`${date}T${time || "00:00"}:00-06:00`);
  await prisma.event.create({
    data: { schoolId: user.schoolId, title, description: description || null, startsAt, allDay: !time, kind, audience, levelId, sectionId },
  });
  revalidatePath("/escuela/calendario");
  revalidatePath("/familia", "layout");
  return { ok: "Evento agregado al calendario." };
}

/* ---------- Cobros ---------- */

const paymentSchema = z.object({
  studentId: z.string().min(1, "Elija un alumno."),
  amount: z.coerce.number().int("El monto debe ser en colones, sin decimales.").positive("El monto debe ser mayor que cero."),
  method: z.enum(["BANCO_POPULAR", "SINPE", "TRANSFER", "CASH"]),
  reference: z.string().trim().max(60).optional(),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elija la fecha del pago."),
  note: z.string().trim().max(120).optional(),
});

export async function registerPayment(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría registran pagos." };
  const raw = Object.fromEntries(form);
  const parsed = paymentSchema.safeParse({ ...raw, amount: String(raw.amount ?? "").replace(/[^\d]/g, "") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const p = parsed.data;
  const student = await prisma.student.findFirst({ where: { id: p.studentId, section: { schoolYear: { schoolId: user.schoolId } } } });
  if (!student) return { error: "Alumno no encontrado." };
  await prisma.payment.create({
    data: {
      studentId: p.studentId,
      amount: p.amount,
      method: p.method as PaymentMethod,
      reference: p.reference || null,
      paidAt: keyToDate(p.paidAt),
      note: p.note || "Pago",
      loggedById: user.id,
    },
  });
  revalidatePath("/escuela/cobros");
  revalidatePath("/familia", "layout");
  return { ok: `Pago registrado para ${student.firstName} ${student.lastName}.` };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

export async function generateMonthlyCharges(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría generan cobros." };
  const month = String(form.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Elija el mes." };
  const concept = await prisma.feeConcept.findFirst({ where: { schoolId: user.schoolId, recurring: true } });
  if (!concept) return { error: "No hay un concepto de mensualidad configurado." };
  const [y, m] = month.split("-").map(Number);
  const students = await prisma.student.findMany({ where: { section: { schoolYear: { schoolId: user.schoolId, active: true } } }, select: { id: true } });
  const result = await prisma.charge.createMany({
    data: students.map((s) => ({
      studentId: s.id,
      conceptId: concept.id,
      description: `Mensualidad ${MONTHS[m - 1].slice(0, 3)}`,
      period: month,
      amount: concept.defaultAmount,
      dueDate: new Date(Date.UTC(y, m - 1, 10)),
    })),
    skipDuplicates: true,
  });
  revalidatePath("/escuela/cobros");
  revalidatePath("/familia", "layout");
  if (result.count === 0) return { ok: `La mensualidad de ${MONTHS[m - 1]} ya estaba generada para todos los alumnos.` };
  return { ok: `Se generó la mensualidad de ${MONTHS[m - 1]} para ${result.count} alumnos.` };
}
