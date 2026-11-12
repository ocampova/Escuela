import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";
import type { CurrentUser } from "./auth";
import { isManager } from "./auth";
import { keyToDate, todayKey } from "./format";

export const sectionInclude = { grade: { include: { level: true } } } satisfies Prisma.SectionInclude;

/* ---------- Familias ---------- */

export async function guardianStudents(userId: string) {
  return prisma.student.findMany({
    where: { guardians: { some: { userId } } },
    include: { section: { include: { ...sectionInclude, teacher: { select: { name: true } } } } },
    orderBy: { birthDate: "asc" },
  });
}

export type GuardianStudent = Awaited<ReturnType<typeof guardianStudents>>[number];

export function audienceFilter(students: GuardianStudent[]): Prisma.AnnouncementWhereInput {
  return {
    OR: [
      { audience: "SCHOOL" },
      { audience: "LEVEL", levelId: { in: students.map((s) => s.section.grade.levelId) } },
      { audience: "SECTION", sectionId: { in: students.map((s) => s.sectionId) } },
    ],
  };
}

export function eventFilter(students: GuardianStudent[]): Prisma.EventWhereInput {
  return {
    OR: [
      { audience: "SCHOOL" },
      { audience: "LEVEL", levelId: { in: students.map((s) => s.section.grade.levelId) } },
      { audience: "SECTION", sectionId: { in: students.map((s) => s.sectionId) } },
    ],
  };
}

export async function guardianAnnouncements(user: CurrentUser, students: GuardianStudent[], take?: number) {
  return prisma.announcement.findMany({
    where: { schoolId: user.schoolId, ...audienceFilter(students) },
    include: {
      author: { select: { name: true, role: true } },
      section: { include: { grade: true } },
      level: true,
      reads: { where: { userId: user.id } },
      images: { select: { id: true }, orderBy: { order: "asc" }, take: 1 },
      permissionAnswers: { where: { studentId: { in: students.map((s) => s.id) } }, select: { studentId: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });
}

/* ---------- Estado de cuenta ---------- */

export type StatementLine = {
  id: string;
  kind: "charge" | "payment";
  date: Date;
  description: string;
  amount: number;
  currency: "CRC" | "USD";
  method?: string;
  reference?: string | null;
  status?: "paid" | "partial" | "due" | "overdue";
  paidAmount?: number;
};

type Bucket = { charged: number; paid: number; overdue: number };

export type Statement = Bucket & {
  charges: StatementLine[];
  payments: StatementLine[];
  nextDue?: StatementLine;
  /** Saldos en dólares (p. ej. paquete de robótica) */
  usd: Bucket;
};

/** Aplica pagos a cargos en orden de vencimiento (FIFO), por moneda. */
export async function statementFor(studentIds: string[]) {
  const [charges, payments] = await Promise.all([
    prisma.charge.findMany({ where: { studentId: { in: studentIds } }, orderBy: { dueDate: "asc" } }),
    prisma.payment.findMany({ where: { studentId: { in: studentIds } }, orderBy: { paidAt: "asc" } }),
  ]);
  const today = keyToDate(todayKey());
  const byStudent = new Map<string, Statement>();

  for (const id of studentIds) {
    const entry: Statement = { charges: [], payments: [], charged: 0, paid: 0, overdue: 0, usd: { charged: 0, paid: 0, overdue: 0 } };
    for (const cur of ["CRC", "USD"] as const) {
      const bucket: Bucket = cur === "CRC" ? entry : entry.usd;
      const ps = payments.filter((p) => p.studentId === id && p.currency === cur);
      let credit = ps.reduce((s, p) => s + p.amount, 0);
      bucket.paid = credit;
      for (const c of charges.filter((c) => c.studentId === id && c.currency === cur)) {
        const applied = Math.min(credit, c.amount);
        credit -= applied;
        bucket.charged += c.amount;
        const pending = c.amount - applied;
        const status = pending === 0 ? "paid" : c.dueDate < today ? "overdue" : applied > 0 ? "partial" : "due";
        if (status === "overdue") bucket.overdue += pending;
        const line: StatementLine = { id: c.id, kind: "charge", date: c.dueDate, description: c.description, amount: c.amount, currency: cur, status, paidAmount: applied };
        entry.charges.push(line);
        if (cur === "CRC" && !entry.nextDue && pending > 0) entry.nextDue = line;
      }
      entry.payments.push(
        ...ps.map((p) => ({ id: p.id, kind: "payment" as const, date: p.paidAt, description: p.note ?? "Pago", amount: p.amount, currency: cur, method: p.method, reference: p.reference })),
      );
    }
    entry.charges.sort((a, b) => a.date.getTime() - b.date.getTime());
    entry.payments.sort((a, b) => a.date.getTime() - b.date.getTime());
    byStudent.set(id, entry);
  }
  return byStudent;
}

export const METHOD_LABEL: Record<string, string> = {
  BANCO_POPULAR: "Banco Popular",
  SINPE: "SINPE Móvil",
  TRANSFER: "Transferencia",
  DEPOSIT: "Depósito",
  CASH: "Efectivo",
};

/* ---------- Escuela ---------- */

export async function staffSections(user: CurrentUser) {
  return prisma.section.findMany({
    where: { schoolYear: { schoolId: user.schoolId, active: true }, ...(isManager(user) ? {} : { teacherId: user.id }) },
    include: { ...sectionInclude, teacher: { select: { name: true } }, _count: { select: { students: { where: { status: "ACTIVE" } } } } },
    orderBy: [{ grade: { level: { order: "asc" } } }, { grade: { order: "asc" } }, { name: "asc" }],
  });
}

/** Familias (usuarios encargados) a las que llega un aviso */
export async function announcementRecipients(a: { schoolId: string; audience: string; levelId: string | null; sectionId: string | null }) {
  const studentWhere: Prisma.StudentWhereInput =
    a.audience === "SECTION"
      ? { status: "ACTIVE", sectionId: a.sectionId ?? undefined }
      : a.audience === "LEVEL"
        ? { status: "ACTIVE", section: { grade: { levelId: a.levelId ?? undefined } } }
        : { status: "ACTIVE", section: { schoolYear: { schoolId: a.schoolId, active: true } } };
  return prisma.user.findMany({
    where: { role: "GUARDIAN", guardianOf: { some: { student: studentWhere } } },
    select: {
      id: true,
      name: true,
      phone: true,
      guardianOf: { where: { student: studentWhere }, select: { student: { select: { firstName: true, lastName: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

/** ¿El aviso le pide algo pendiente a esta familia? (Enterado, o autorización de algún hijo sin responder) */
export function isPending(
  a: { requiresAck: boolean; permissionQuestion: string | null; audience: string; levelId: string | null; sectionId: string | null; reads: { acknowledgedAt: Date | null }[]; permissionAnswers: { studentId: string }[] },
  students: GuardianStudent[],
) {
  if (a.permissionQuestion) {
    const kids = students.filter((s) => a.audience === "SCHOOL" || (a.audience === "LEVEL" && s.section.grade.levelId === a.levelId) || (a.audience === "SECTION" && s.sectionId === a.sectionId));
    return kids.some((k) => !a.permissionAnswers.some((r) => r.studentId === k.id));
  }
  return a.requiresAck && !a.reads[0]?.acknowledgedAt;
}

export function audienceLabel(a: { audience: string; level?: { name: string } | null; section?: { name: string; grade: { name: string } } | null }) {
  if (a.audience === "SECTION" && a.section) return `${a.section.grade.name} ${a.section.name}`;
  if (a.audience === "LEVEL" && a.level) return a.level.name;
  return "Toda la escuela";
}
