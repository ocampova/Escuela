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
  method?: string;
  reference?: string | null;
  status?: "paid" | "partial" | "due" | "overdue";
  paidAmount?: number;
};

/** Aplica pagos a cargos en orden de vencimiento (FIFO). */
export async function statementFor(studentIds: string[]) {
  const [charges, payments] = await Promise.all([
    prisma.charge.findMany({ where: { studentId: { in: studentIds } }, orderBy: { dueDate: "asc" } }),
    prisma.payment.findMany({ where: { studentId: { in: studentIds } }, orderBy: { paidAt: "asc" } }),
  ]);
  const today = keyToDate(todayKey());
  const byStudent = new Map<string, { charges: StatementLine[]; payments: StatementLine[]; charged: number; paid: number; overdue: number; nextDue?: StatementLine }>();
  for (const id of studentIds) byStudent.set(id, { charges: [], payments: [], charged: 0, paid: 0, overdue: 0 });

  for (const id of studentIds) {
    const entry = byStudent.get(id)!;
    const ps = payments.filter((p) => p.studentId === id);
    let credit = ps.reduce((s, p) => s + p.amount, 0);
    entry.paid = credit;
    for (const c of charges.filter((c) => c.studentId === id)) {
      const applied = Math.min(credit, c.amount);
      credit -= applied;
      entry.charged += c.amount;
      const pending = c.amount - applied;
      const status = pending === 0 ? "paid" : c.dueDate < today ? "overdue" : applied > 0 ? "partial" : "due";
      if (status === "overdue") entry.overdue += pending;
      const line: StatementLine = { id: c.id, kind: "charge", date: c.dueDate, description: c.description, amount: c.amount, status, paidAmount: applied };
      entry.charges.push(line);
      if (!entry.nextDue && pending > 0) entry.nextDue = line;
    }
    entry.payments = ps.map((p) => ({
      id: p.id,
      kind: "payment",
      date: p.paidAt,
      description: p.note ?? "Pago",
      amount: p.amount,
      method: p.method,
      reference: p.reference,
    }));
  }
  return byStudent;
}

export const METHOD_LABEL: Record<string, string> = {
  BANCO_POPULAR: "Banco Popular",
  SINPE: "SINPE Móvil",
  TRANSFER: "Transferencia",
  CASH: "Efectivo",
};

/* ---------- Escuela ---------- */

export async function staffSections(user: CurrentUser) {
  return prisma.section.findMany({
    where: { schoolYear: { schoolId: user.schoolId, active: true }, ...(isManager(user) ? {} : { teacherId: user.id }) },
    include: { ...sectionInclude, teacher: { select: { name: true } }, _count: { select: { students: true } } },
    orderBy: [{ grade: { level: { order: "asc" } } }, { grade: { order: "asc" } }, { name: "asc" }],
  });
}

/** Familias (usuarios encargados) a las que llega un aviso */
export async function announcementRecipients(a: { schoolId: string; audience: string; levelId: string | null; sectionId: string | null }) {
  const studentWhere: Prisma.StudentWhereInput =
    a.audience === "SECTION"
      ? { sectionId: a.sectionId ?? undefined }
      : a.audience === "LEVEL"
        ? { section: { grade: { levelId: a.levelId ?? undefined } } }
        : { section: { schoolYear: { schoolId: a.schoolId, active: true } } };
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

export function audienceLabel(a: { audience: string; level?: { name: string } | null; section?: { name: string; grade: { name: string } } | null }) {
  if (a.audience === "SECTION" && a.section) return `${a.section.grade.name} ${a.section.name}`;
  if (a.audience === "LEVEL" && a.level) return a.level.name;
  return "Toda la escuela";
}
