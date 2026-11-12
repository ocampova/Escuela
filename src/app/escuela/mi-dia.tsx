import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpenCheck, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, MessageCircle, NotebookPen } from "lucide-react";
import { prisma } from "@/lib/db";
import { currentTerm } from "@/lib/academic";
import { capitalize, dateLabel, gradeSectionName, keyToDate, todayKey } from "@/lib/format";
import { unreadConversations } from "@/lib/messages";
import type { CurrentUser } from "@/lib/auth";
import { Card, SectionChip, SectionHeading, cx } from "@/components/ui";
import { QuickButton } from "./quick-button";
import { quickAttendance, quickDaily } from "./quick-actions";

type Section = { id: string; name: string; color: string; schoolYearId: string; grade: { name: string; levelId: string; level: { evaluation: string } } };

/** Una tarea del día: icono, estado y la acción para resolverla ahí mismo. */
function Item({ icon, title, detail, done, children, href }: { icon: ReactNode; title: string; detail?: ReactNode; done?: boolean; children?: ReactNode; href?: string }) {
  return (
    <li className="flex gap-3 px-4 py-4">
      <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", done ? "bg-ok-soft text-ok" : "bg-brand-soft text-brand")}>
        {done ? <CheckCircle2 className="size-5" aria-hidden /> : icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className={cx("font-medium", done && "text-ink-2")}>{title}</p>
          {href && (
            <Link href={href} className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-brand hover:underline">
              {done ? "Ver" : "Abrir"} <ChevronRight className="size-4" aria-hidden />
            </Link>
          )}
        </div>
        {detail && <div className="mt-0.5 text-sm text-ink-2">{detail}</div>}
        {children && <div className="mt-3">{children}</div>}
      </div>
    </li>
  );
}

/** "Mi día": lo que la docente tiene que hacer hoy, con lo frecuente a un toque. */
export async function TeacherToday({ user, sections, schoolDay }: { user: CurrentUser; sections: Section[]; schoolDay: boolean }) {
  const day = keyToDate(todayKey());
  const ids = sections.map((s) => s.id);
  const tomorrow = new Date(day.getTime() + 86_400_000);
  const [students, unread, homework, terms] = await Promise.all([
    prisma.student.findMany({
      where: { sectionId: { in: ids }, status: "ACTIVE" },
      select: {
        id: true,
        sectionId: true,
        attendance: { where: { date: day }, select: { status: true } },
        absenceNotices: { where: { dateFrom: { lte: day }, dateTo: { gte: day } }, select: { id: true } },
        dailyReports: { where: { day }, select: { sentAt: true, activity: true } },
      },
    }),
    user.school.messagingEnabled ? unreadConversations(user) : Promise.resolve(0),
    prisma.homework.findMany({ where: { sectionId: { in: ids }, dueDate: { gte: day, lte: tomorrow } }, orderBy: { dueDate: "asc" }, include: { subject: true } }),
    prisma.term.findMany({ where: { schoolYearId: { in: [...new Set(sections.map((s) => s.schoolYearId))] } }, orderBy: { order: "asc" } }),
  ]);
  const term = currentTerm(terms);

  // Avance de notas o informes del periodo vigente, por sección
  const progress = term
    ? await Promise.all(
        sections.map(async (s) => {
          const kids = students.filter((k) => k.sectionId === s.id).map((k) => k.id);
          if (s.grade.level.evaluation === "DESCRIPTIVE") {
            const areas = await prisma.subject.count({ where: { levelId: s.grade.levelId, active: true } });
            const filled = await prisma.areaAssessment.count({ where: { termId: term.id, studentId: { in: kids }, achievement: { not: null }, subject: { active: true } } });
            return { s, done: filled, total: areas * kids.length, label: "informes al hogar" };
          }
          const [subjects, comps] = await Promise.all([
            prisma.subject.count({ where: { levelId: s.grade.levelId, active: true } }),
            prisma.gradeComponent.count({ where: { levelId: s.grade.levelId } }),
          ]);
          const filled = await prisma.score.count({ where: { termId: term.id, studentId: { in: kids }, subject: { active: true } } });
          return { s, done: filled, total: subjects * comps * kids.length, label: "notas" };
        }),
      )
    : [];

  return (
    <section>
      <SectionHeading title="Para hoy" />
      <Card className="divide-y divide-line">
        <ul className="divide-y divide-line">
          {schoolDay &&
            sections.map((s) => {
              const kids = students.filter((k) => k.sectionId === s.id);
              const taken = kids.some((k) => k.attendance.length > 0);
              const present = kids.filter((k) => k.attendance[0]?.status === "PRESENT" || k.attendance[0]?.status === "LATE").length;
              const noticed = kids.filter((k) => k.absenceNotices.length > 0).length;
              const label = sections.length > 1 ? ` · ${gradeSectionName(s)}` : "";
              return (
                <Item
                  key={`att-${s.id}`}
                  icon={<ClipboardCheck className="size-5" aria-hidden />}
                  title={taken ? `Lista pasada${label}` : `Pasar lista${label}`}
                  done={taken}
                  href={`/escuela/asistencia?seccion=${s.id}`}
                  detail={
                    taken
                      ? `${present} de ${kids.length} presentes.`
                      : `${kids.length} alumnos${noticed ? ` · ${noticed} ${noticed === 1 ? "ausencia avisada" : "ausencias avisadas"} por la familia (ya quedan marcadas)` : ""}.`
                  }
                >
                  {!taken && kids.length > 0 && <QuickButton run={quickAttendance.bind(null, s.id)} label={noticed ? "Los demás presentes: guardar" : "Todos presentes: guardar"} />}
                </Item>
              );
            })}

          {schoolDay &&
            sections
              .filter((s) => s.grade.level.evaluation === "DESCRIPTIVE")
              .map((s) => {
                const kids = students.filter((k) => k.sectionId === s.id);
                const here = kids.filter((k) => k.attendance[0]?.status !== "ABSENT" && k.attendance[0]?.status !== "EXCUSED");
                const sent = kids.filter((k) => k.dailyReports[0]?.sentAt).length;
                const done = here.length > 0 && sent >= here.length;
                const label = sections.length > 1 ? ` · ${gradeSectionName(s)}` : "";
                return (
                  <Item
                    key={`daily-${s.id}`}
                    icon={<NotebookPen className="size-5" aria-hidden />}
                    title={done ? `Reporte diario enviado${label}` : `Reporte diario${label}`}
                    done={done}
                    href={`/escuela/diario?seccion=${s.id}`}
                    detail={done ? `Lo recibieron ${sent} familias.` : sent ? `Enviado a ${sent} de ${here.length}. Complete a los demás con lo habitual o ajuste uno por uno.` : "Envíe lo habitual a todos y ajuste solo a quien tuvo algo distinto."}
                  >
                    {!done && here.length > 0 && (
                      <QuickButton
                        run={quickDaily.bind(null, s.id)}
                        withActivity
                        activity={kids.find((k) => k.dailyReports[0]?.activity)?.dailyReports[0]?.activity ?? ""}
                        label="Enviar lo habitual a todos"
                        pendingLabel="Enviando…"
                      />
                    )}
                  </Item>
                );
              })}

          {user.school.messagingEnabled && (
            <Item
              icon={<MessageCircle className="size-5" aria-hidden />}
              title={unread ? `${unread} ${unread === 1 ? "mensaje sin responder" : "mensajes sin responder"}` : "Mensajes al día"}
              done={!unread}
              href="/escuela/mensajes"
            />
          )}

          <Item
            icon={<ClipboardList className="size-5" aria-hidden />}
            title={homework.length ? `Tareas que se entregan hoy o mañana (${homework.length})` : "Sin tareas para hoy ni mañana"}
            done={!homework.length}
            href="/escuela/tareas"
            detail={
              homework.length > 0 && (
                <ul className="space-y-0.5">
                  {homework.slice(0, 3).map((h) => (
                    <li key={h.id} className="truncate">
                      {capitalize(dateLabel(h.dueDate, { weekday: "short" }))}: {h.title}
                      {h.subject ? ` · ${h.subject.name}` : ""}
                    </li>
                  ))}
                </ul>
              )
            }
          />

          {progress.map(({ s, done, total, label }) => {
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Item
                key={`prog-${s.id}`}
                icon={<BookOpenCheck className="size-5" aria-hidden />}
                title={`${capitalize(label)} del ${term!.name}${sections.length > 1 ? ` · ${gradeSectionName(s)}` : ""}`}
                done={total > 0 && done >= total}
                href={`/escuela/academico?seccion=${s.id}&periodo=${term!.id}`}
                detail={
                  <span className="flex items-center gap-3">
                    <span className="h-1.5 max-w-40 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </span>
                    <span className="tabular">{pct}% listo · cierra el {dateLabel(term!.endsOn, { day: "numeric", month: "short" })}</span>
                  </span>
                }
              />
            );
          })}
        </ul>
      </Card>
      {sections.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {sections.map((s) => (
            <SectionChip key={s.id} color={s.color} label={gradeSectionName(s)} />
          ))}
        </div>
      )}
    </section>
  );
}
