"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import { dateLabel, keyToDate, todayKey } from "@/lib/format";
import { notifyLater } from "@/lib/push";
import { ACHIEVEMENTS } from "@/lib/academic";
import type { ActionState } from "@/components/action-form";

async function assertSection(sectionId: string) {
  const user = await requireStaff();
  const section = await prisma.section.findFirst({
    where: { id: sectionId, schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) },
    include: { grade: { include: { level: true } }, schoolYear: true },
  });
  if (!section) throw new Error("No tiene acceso a esta sección");
  return { user, section };
}

async function assertTerm(termId: string, schoolYearId: string) {
  const term = await prisma.term.findFirst({ where: { id: termId, schoolYearId } });
  if (!term) throw new Error("Periodo no válido");
  return term;
}

const refresh = () => {
  revalidatePath("/escuela", "layout");
  revalidatePath("/familia", "layout");
};

/* ---------- Notas (primaria) ---------- */

export async function saveScores(_p: ActionState, f: FormData): Promise<ActionState> {
  const { section } = await assertSection(String(f.get("sectionId")));
  const term = await assertTerm(String(f.get("termId")), section.schoolYearId);
  const subject = await prisma.subject.findFirst({ where: { id: String(f.get("subjectId")), levelId: section.grade.levelId } });
  if (!subject) return { error: "Materia no válida." };
  const [students, components] = await Promise.all([
    prisma.student.findMany({ where: { sectionId: section.id, status: "ACTIVE" }, select: { id: true } }),
    prisma.gradeComponent.findMany({ where: { levelId: section.grade.levelId } }),
  ]);
  const ops = [];
  for (const s of students) {
    for (const c of components) {
      const raw = String(f.get(`s-${s.id}-${c.id}`) ?? "").trim().replace(",", ".");
      const where = { studentId_subjectId_termId_componentId: { studentId: s.id, subjectId: subject.id, termId: term.id, componentId: c.id } };
      if (raw === "") {
        ops.push(prisma.score.deleteMany({ where: { studentId: s.id, subjectId: subject.id, termId: term.id, componentId: c.id } }));
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) return { error: `Hay una nota fuera de rango (${raw}). Use valores de 0 a 100.` };
      ops.push(prisma.score.upsert({ where, create: { studentId: s.id, subjectId: subject.id, termId: term.id, componentId: c.id, value }, update: { value } }));
    }
  }
  await prisma.$transaction(ops);
  refresh();
  return { ok: `Notas de ${subject.name} guardadas.` };
}

/** Observaciones generales del periodo (una por alumno). */
export async function saveObservations(_p: ActionState, f: FormData): Promise<ActionState> {
  const { section } = await assertSection(String(f.get("sectionId")));
  const term = await assertTerm(String(f.get("termId")), section.schoolYearId);
  const students = await prisma.student.findMany({ where: { sectionId: section.id, status: "ACTIVE" }, select: { id: true } });
  await prisma.$transaction(
    students.map((s) => {
      const comment = String(f.get(`obs-${s.id}`) ?? "").trim().slice(0, 1500) || null;
      return prisma.termReport.upsert({ where: { studentId_termId: { studentId: s.id, termId: term.id } }, create: { studentId: s.id, termId: term.id, comment }, update: { comment } });
    }),
  );
  refresh();
  return { ok: "Observaciones guardadas." };
}

/* ---------- Informe al hogar (preescolar) ---------- */

export async function saveHomeReport(_p: ActionState, f: FormData): Promise<ActionState> {
  const student = await prisma.student.findUnique({ where: { id: String(f.get("studentId")) }, select: { id: true, sectionId: true, firstName: true } });
  if (!student) return { error: "Alumno no encontrado." };
  const { section } = await assertSection(student.sectionId);
  const term = await assertTerm(String(f.get("termId")), section.schoolYearId);
  const areas = await prisma.subject.findMany({ where: { levelId: section.grade.levelId, active: true } });
  const valid = new Set<string>(ACHIEVEMENTS.map((a) => a.value));
  await prisma.$transaction([
    ...areas.map((a) => {
      const ach = String(f.get(`ach-${a.id}`) ?? "");
      const achievement = valid.has(ach) ? ach : null;
      const comment = String(f.get(`com-${a.id}`) ?? "").trim().slice(0, 1500) || null;
      return prisma.areaAssessment.upsert({
        where: { studentId_subjectId_termId: { studentId: student.id, subjectId: a.id, termId: term.id } },
        create: { studentId: student.id, subjectId: a.id, termId: term.id, achievement, comment },
        update: { achievement, comment },
      });
    }),
    (() => {
      const comment = String(f.get("general") ?? "").trim().slice(0, 2000) || null;
      return prisma.termReport.upsert({ where: { studentId_termId: { studentId: student.id, termId: term.id } }, create: { studentId: student.id, termId: term.id, comment }, update: { comment } });
    })(),
  ]);
  refresh();
  return { ok: `Informe de ${student.firstName} guardado.` };
}

/* ---------- Publicar boletas ---------- */

export async function setPublished(sectionId: string, termId: string, publish: boolean) {
  const { section } = await assertSection(sectionId);
  const term = await assertTerm(termId, section.schoolYearId);
  if (publish) {
    const created = await prisma.termPublication.upsert({ where: { termId_sectionId: { termId, sectionId } }, create: { termId, sectionId }, update: {} });
    if (Date.now() - created.publishedAt.getTime() < 10_000) {
      const students = await prisma.student.findMany({ where: { sectionId, status: "ACTIVE" }, include: { guardians: { select: { userId: true } } } });
      const descriptive = section.grade.level.evaluation === "DESCRIPTIVE";
      for (const s of students) {
        notifyLater(
          s.guardians.map((g) => g.userId),
          { title: `${descriptive ? "Informe al hogar" : "Boleta"} de ${s.firstName}`, body: `Ya está disponible la ${descriptive ? "evaluación" : "boleta"} del ${term.name}.`, url: `/boletas/${s.id}/${term.id}`, tag: `boleta-${s.id}-${term.id}` },
        );
      }
    }
  } else {
    await prisma.termPublication.deleteMany({ where: { termId, sectionId } });
  }
  refresh();
}

/* ---------- Tareas ---------- */

export async function createHomework(_p: ActionState, f: FormData): Promise<ActionState> {
  const { user, section } = await assertSection(String(f.get("sectionId")));
  const title = String(f.get("title") ?? "").trim().slice(0, 140);
  const description = String(f.get("description") ?? "").trim().slice(0, 2000) || null;
  const due = String(f.get("dueDate") ?? "");
  if (!title) return { error: "Escriba qué tienen que hacer." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(due) || due < todayKey()) return { error: "Elija una fecha de entrega de hoy en adelante." };
  const subjectId = String(f.get("subjectId") ?? "") || null;
  if (subjectId && !(await prisma.subject.findFirst({ where: { id: subjectId, levelId: section.grade.levelId } }))) return { error: "Materia no válida." };
  const hw = await prisma.homework.create({ data: { sectionId: section.id, subjectId, title, description, dueDate: keyToDate(due), authorId: user.id }, include: { subject: true } });
  const guardians = await prisma.studentGuardian.findMany({ where: { student: { sectionId: section.id } }, select: { userId: true } });
  notifyLater(guardians.map((g) => g.userId), {
    title: `Tarea${hw.subject ? ` de ${hw.subject.name}` : ""}: ${title}`,
    body: `Para el ${dateLabel(hw.dueDate, { weekday: "long", day: "numeric", month: "long" })}.`,
    url: "/familia/tareas",
    tag: `tarea-${hw.id}`,
  });
  refresh();
  return { ok: "Tarea publicada. Las familias recibieron una notificación." };
}

export async function deleteHomework(id: string) {
  const user = await requireStaff();
  const hw = await prisma.homework.findFirst({ where: { id, section: { schoolYear: { schoolId: user.schoolId }, ...(isManager(user) ? {} : { teacherId: user.id }) } } });
  if (!hw) throw new Error("No encontrado");
  await prisma.homework.delete({ where: { id } });
  refresh();
}

/* ---------- Configuración académica (Dirección y Secretaría) ---------- */

async function manager() {
  const u = await requireStaff();
  if (!isManager(u)) throw new Error("Solo Dirección y Secretaría pueden cambiar la configuración.");
  return u;
}

export async function addTerm(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const year = await prisma.schoolYear.findFirst({ where: { schoolId: u.schoolId, active: true } });
  if (!year) return { error: "Primero configure el curso lectivo." };
  const name = String(f.get("name") ?? "").trim().slice(0, 60);
  const startsOn = String(f.get("startsOn") ?? "");
  const endsOn = String(f.get("endsOn") ?? "");
  if (!name) return { error: "Escriba el nombre del periodo." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn <= startsOn) return { error: "Revise las fechas del periodo." };
  const count = await prisma.term.count({ where: { schoolYearId: year.id } });
  await prisma.term.create({ data: { schoolYearId: year.id, name, order: count + 1, startsOn: keyToDate(startsOn), endsOn: keyToDate(endsOn) } });
  refresh();
  return { ok: "Periodo agregado." };
}

export async function deleteTerm(id: string) {
  const u = await manager();
  const t = await prisma.term.findFirst({ where: { id, schoolYear: { schoolId: u.schoolId } }, include: { _count: { select: { scores: true, areaNotes: true } } } });
  if (!t) throw new Error("No encontrado");
  if (t._count.scores + t._count.areaNotes > 0) throw new Error("El periodo ya tiene notas; no se puede eliminar.");
  await prisma.term.delete({ where: { id } });
  refresh();
}

export async function addSubject(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const level = await prisma.level.findFirst({ where: { id: String(f.get("levelId")), schoolId: u.schoolId } });
  if (!level) return { error: "Nivel no válido." };
  const name = String(f.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Escriba el nombre." };
  const count = await prisma.subject.count({ where: { levelId: level.id } });
  await prisma.subject.create({ data: { levelId: level.id, name, order: count + 1 } });
  refresh();
  return { ok: `${name} agregado.` };
}

export async function toggleSubject(id: string, active: boolean) {
  const u = await manager();
  await prisma.subject.updateMany({ where: { id, level: { schoolId: u.schoolId } }, data: { active } });
  refresh();
}

export async function saveLevelEvaluation(_p: ActionState, f: FormData): Promise<ActionState> {
  const u = await manager();
  const level = await prisma.level.findFirst({ where: { id: String(f.get("levelId")), schoolId: u.schoolId }, include: { components: true } });
  if (!level) return { error: "Nivel no válido." };
  const evaluation = f.get("evaluation") === "DESCRIPTIVE" ? "DESCRIPTIVE" : "NUMERIC";
  const rows: { id?: string; name: string; weight: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const name = String(f.get(`cname-${i}`) ?? "").trim().slice(0, 60);
    const w = String(f.get(`cweight-${i}`) ?? "").trim();
    if (!name && !w) continue;
    const weight = Number(w.replace(",", "."));
    if (!name || !Number.isFinite(weight) || weight <= 0) return { error: "Cada componente necesita nombre y un porcentaje mayor que 0." };
    rows.push({ id: String(f.get(`cid-${i}`) ?? "") || undefined, name, weight });
  }
  if (evaluation === "NUMERIC") {
    const total = rows.reduce((a, r) => a + r.weight, 0);
    if (Math.abs(total - 100) > 0.01) return { error: `Los porcentajes suman ${total}%; deben sumar 100%.` };
  }
  const keep = rows.filter((r) => r.id && level.components.some((c) => c.id === r.id)).map((r) => r.id!);
  await prisma.$transaction([
    prisma.level.update({ where: { id: level.id }, data: { evaluation } }),
    prisma.gradeComponent.deleteMany({ where: { levelId: level.id, id: { notIn: keep } } }),
    ...rows.map((r, i) =>
      r.id && keep.includes(r.id)
        ? prisma.gradeComponent.update({ where: { id: r.id }, data: { name: r.name, weight: r.weight, order: i } })
        : prisma.gradeComponent.create({ data: { levelId: level.id, name: r.name, weight: r.weight, order: i } }),
    ),
  ]);
  refresh();
  return { ok: `Evaluación de ${level.name} guardada.` };
}
