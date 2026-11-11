"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AttendanceStatus, PaymentMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import { keyToDate } from "@/lib/format";
import { notifyLater } from "@/lib/push";
import { mailAnnouncement, mailReceipt } from "@/lib/emails";
import { announcementRecipients } from "@/lib/queries";
import { money } from "@/lib/format";

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
  const previous = new Map((await prisma.attendance.findMany({ where: { date: d, student: { sectionId } }, select: { studentId: true, status: true } })).map((x) => [x.studentId, x.status as string]));
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
  // Avisar a las familias de ausencias y tardías de hoy (solo cambios nuevos)
  if (date === new Date(Date.now() - 6 * 3600_000).toISOString().slice(0, 10)) {
    const flagged = students.filter((st) => {
      const v = String(form.get(`status-${st.id}`) ?? "");
      return (v === "ABSENT" || v === "LATE") && previous.get(st.id) !== v;
    });
    if (flagged.length) {
      const info = await prisma.student.findMany({ where: { id: { in: flagged.map((x) => x.id) } }, include: { guardians: true } });
      for (const st of info) {
        const v = String(form.get(`status-${st.id}`));
        notifyLater(
          st.guardians.map((g) => g.userId),
          { title: v === "ABSENT" ? `${st.firstName} fue marcado ausente hoy` : `${st.firstName} llegó tarde hoy`, body: "Si tiene una justificación, escríbale a la docente.", url: `/familia/hijos/${st.id}`, tag: `att-${st.id}` },
        );
      }
    }
  }
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
  if (missing > 0) return { ok: `Lista guardada. ${missing} ${missing === 1 ? "alumno quedó" : "alumnos quedaron"} sin marcar.` };
  return { ok: "Lista guardada. Las familias ya pueden verla." };
}

/* ---------- Avisos ---------- */

const announcementSchema = z.object({
  title: z.string().trim().max(120),
  body: z.string().trim().max(5000),
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
  const { body, target } = parsed.data;
  const permissionQuestion = form.get("askPermission") === "on" ? String(form.get("permissionQuestion") ?? "").trim().slice(0, 200) : "";
  if (form.get("askPermission") === "on" && permissionQuestion.length < 5) return { error: "Escriba la pregunta de la autorización (ej.: ¿Autoriza la gira al Museo de los Niños?)." };
  const deadlineRaw = String(form.get("permissionDeadline") ?? "");
  const permissionDeadline = permissionQuestion && /^\d{4}-\d{2}-\d{2}$/.test(deadlineRaw) ? new Date(deadlineRaw) : null;
  // Una autorización implica confirmación de lectura
  const requiresAck = parsed.data.requiresAck || Boolean(permissionQuestion);

  // Imágenes (un aviso puede ser solo una imagen, p. ej. una circular hecha en Canva)
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > 6) return { error: "Adjunte como máximo 6 imágenes." };
  for (const f of files) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)) return { error: `«${f.name}» no es una imagen JPG, PNG o WebP.` };
    if (f.size > 8 * 1024 * 1024) return { error: `«${f.name}» pesa más de 8 MB.` };
  }
  if (files.length === 0 && body.length < 10) return { error: "Escriba el mensaje o adjunte una imagen." };
  const today = new Intl.DateTimeFormat("es-CR", { timeZone: "America/Costa_Rica", day: "numeric", month: "long" }).format(new Date());
  const title = parsed.data.title.length >= 3 ? parsed.data.title : files.length ? `Aviso del ${today}` : "";
  if (!title) return { error: "Escriba un título de al menos 3 letras." };

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
    data: {
      schoolId: user.schoolId,
      authorId: user.id,
      title,
      body,
      audience,
      levelId,
      sectionId,
      requiresAck,
      permissionQuestion: permissionQuestion || null,
      permissionDeadline,
      images: {
        create: await Promise.all(files.map(async (f, i) => ({ mimeType: f.type, size: f.size, order: i, data: new Uint8Array(await f.arrayBuffer()) }))),
      },
    },
  });
  const recipients = await announcementRecipients(a);
  mailAnnouncement(a.id, recipients.map((r) => r.id));
  notifyLater(
    recipients.map((r) => r.id),
    { title: permissionQuestion ? `Autorización: ${title}` : `Nuevo aviso: ${title}`, body: permissionQuestion ? permissionQuestion : body ? (body.length > 110 ? body.slice(0, 107) + "…" : body) : "Toque para ver la imagen del aviso.", url: `/familia/avisos/${a.id}`, tag: a.id },
  );
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
  const created = await prisma.payment.create({
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
  mailReceipt(created.id);
  revalidatePath("/escuela/cobros");
  revalidatePath("/familia", "layout");
  return { ok: `Pago registrado para ${student.firstName} ${student.lastName}. Recibo n.º ${created.receiptNumber}.` };
}

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

export async function generateMonthlyCharges(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría generan cobros." };
  const month = String(form.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return { error: "Elija el mes." };
  const concepts = await prisma.feeConcept.findMany({ where: { schoolId: user.schoolId, recurring: true } });
  if (concepts.length === 0) return { error: "No hay un concepto de mensualidad configurado." };
  const [y, m] = month.split("-").map(Number);
  const students = await prisma.student.findMany({
    where: { section: { schoolYear: { schoolId: user.schoolId, active: true } } },
    select: { id: true, section: { select: { grade: { select: { levelId: true } } } } },
  });
  const data = students.flatMap((s) => {
    // Mensualidad del nivel del alumno; si no hay, la general
    const concept = concepts.find((c) => c.levelId === s.section.grade.levelId) ?? concepts.find((c) => !c.levelId);
    if (!concept) return [];
    return [
      {
        studentId: s.id,
        conceptId: concept.id,
        description: `Mensualidad ${MONTHS[m - 1].slice(0, 3)}`,
        period: month,
        amount: concept.defaultAmount,
        currency: concept.currency,
        dueDate: new Date(Date.UTC(y, m - 1, 10)),
      },
    ];
  });
  const result = await prisma.charge.createMany({ data, skipDuplicates: true });
  revalidatePath("/escuela/cobros");
  revalidatePath("/familia", "layout");
  if (result.count === 0) return { ok: `La mensualidad de ${MONTHS[m - 1]} ya estaba generada para todos los alumnos.` };
  return { ok: `Se generó la mensualidad de ${MONTHS[m - 1]} para ${result.count} alumnos, según el precio de cada nivel.` };
}

/** Carga un cobro (materiales, robótica, matrícula…) a todos los alumnos del nivel del concepto. */
export async function chargeConcept(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría generan cobros." };
  const concept = await prisma.feeConcept.findFirst({ where: { id: String(form.get("conceptId") ?? ""), schoolId: user.schoolId }, include: { level: true } });
  if (!concept) return { error: "Elija el concepto." };
  const due = String(form.get("dueDate") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "Elija la fecha de vencimiento." };
  const label = String(form.get("label") ?? "").trim() || concept.name;
  // El periodo identifica el cobro: volver a cargar la misma descripción no lo duplica
  const period = label.slice(0, 60);
  const students = await prisma.student.findMany({
    where: { section: { schoolYear: { schoolId: user.schoolId, active: true }, ...(concept.levelId ? { grade: { levelId: concept.levelId } } : {}) } },
    select: { id: true },
  });
  const result = await prisma.charge.createMany({
    data: students.map((s) => ({ studentId: s.id, conceptId: concept.id, description: label, period, amount: concept.defaultAmount, currency: concept.currency, dueDate: new Date(due) })),
    skipDuplicates: true,
  });
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
  const who = concept.level ? `los alumnos de ${concept.level.name}` : "todos los alumnos";
  if (result.count === 0) return { ok: `«${label}» ya estaba cargado a ${who}.` };
  return { ok: `Se cargó «${label}» a ${result.count} alumnos (${who}).` };
}

/* ---------- Pagos reportados por las familias ---------- */

export async function approveReport(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría aprueban pagos." };
  const report = await prisma.paymentReport.findFirst({
    where: { id: String(form.get("id")), status: "PENDING", student: { section: { schoolYear: { schoolId: user.schoolId } } } },
  });
  if (!report) return { error: "Este reporte ya fue revisado." };
  const amount = Number(String(form.get("amount") ?? "").replace(/[^\d]/g, ""));
  if (!Number.isInteger(amount) || amount <= 0) return { error: "Revise el monto." };
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        studentId: report.studentId,
        amount,
        currency: report.currency,
        method: report.method,
        reference: report.reference,
        paidAt: report.paidAt,
        note: report.concept,
        loggedById: user.id,
      },
    });
    await tx.paymentReport.update({ where: { id: report.id }, data: { status: "APPROVED", reviewedById: user.id, reviewedAt: new Date(), paymentId: payment.id } });
    return payment.id;
  }).then((paymentId) => mailReceipt(paymentId));
  notifyLater([report.reportedById], { title: "Pago aplicado", body: `${report.concept}: ${money(amount, report.currency)} ya está en su estado de cuenta.`, url: "/familia/cuenta", tag: report.id });
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
  redirect("/escuela/cobros?revisado=aprobado");
}

export async function rejectReport(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría revisan pagos." };
  const note = String(form.get("reviewNote") ?? "").trim();
  if (note.length < 5) return { error: "Explique a la familia por qué se rechaza (ej.: el monto no coincide)." };
  const r = await prisma.paymentReport.updateMany({
    where: { id: String(form.get("id")), status: "PENDING", student: { section: { schoolYear: { schoolId: user.schoolId } } } },
    data: { status: "REJECTED", reviewNote: note, reviewedById: user.id, reviewedAt: new Date() },
  });
  if (r.count === 0) return { error: "Este reporte ya fue revisado." };
  const rep = await prisma.paymentReport.findUnique({ where: { id: String(form.get("id")) }, select: { reportedById: true, concept: true } });
  if (rep) notifyLater([rep.reportedById], { title: "Pago rechazado", body: `${rep.concept}: ${note}`, url: "/familia/cuenta" });
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
  redirect("/escuela/cobros?revisado=rechazado");
}

/* ---------- Recordatorios de cobro ---------- */

export async function sendRemindersNow(): Promise<FormState> {
  const user = await requireStaff();
  if (!isManager(user)) return { error: "Solo Dirección y Secretaría envían recordatorios." };
  const { runPaymentReminders } = await import("@/lib/reminders");
  const r = await runPaymentReminders({ schoolId: user.schoolId, force: true });
  if (r.families === 0) return { ok: r.skipped ? "Esas familias ya recibieron un recordatorio hoy." : "No hay familias con montos vencidos ni por vencer en los próximos 3 días." };
  return { ok: `Recordatorio enviado a ${r.families} ${r.families === 1 ? "familia" : "familias"} (${r.overdue} cobros vencidos, ${r.soon} por vencer)${r.emails ? `, ${r.emails} por correo` : ""}.` };
}

export async function setReminders(enabled: boolean) {
  const user = await requireStaff();
  if (user.role !== "ADMIN") throw new Error("Solo Dirección cambia esta opción.");
  await prisma.school.update({ where: { id: user.schoolId }, data: { remindersEnabled: enabled } });
  revalidatePath("/escuela", "layout");
}
