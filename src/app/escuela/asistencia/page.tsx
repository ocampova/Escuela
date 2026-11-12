import Link from "next/link";
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { capitalize, dateLabel, gradeSectionName, keyToDate, todayKey } from "@/lib/format";
import { Card, PageHeader, cx, inputClass, sectionSolid } from "@/components/ui";
import { AttendanceForm } from "./attendance-form";
import { ADAPTATION_SHORT } from "@/lib/student";

export const metadata: Metadata = { title: "Asistencia" };

export default async function AttendancePage({ searchParams }: { searchParams: Promise<{ seccion?: string; fecha?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const section = sections.find((s) => s.id === sp.seccion) ?? sections[0];
  const date = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) && sp.fecha <= todayKey() ? sp.fecha : todayKey();
  const d = keyToDate(date);
  const weekend = [0, 6].includes(d.getUTCDay());

  const students = section
    ? await prisma.student.findMany({
        where: { sectionId: section.id, status: "ACTIVE" },
        include: { attendance: { where: { date: d } }, absenceNotices: { where: { dateFrom: { lte: d }, dateTo: { gte: d } }, orderBy: { createdAt: "desc" }, take: 1 } },
        orderBy: [{ firstName: "asc" }],
      })
    : [];
  const taken = students.some((s) => s.attendance.length > 0);

  return (
    <div>
      <PageHeader title="Asistencia" description="Pase lista en un toque. Las familias ven el registro de inmediato." />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <nav aria-label="Secciones" className="flex flex-wrap gap-1.5">
          {sections.map((s) => (
            <Link
              key={s.id}
              href={`/escuela/asistencia?seccion=${s.id}&fecha=${date}`}
              aria-current={s.id === section?.id ? "page" : undefined}
              className={cx(
                "inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors",
                s.id === section?.id ? `${sectionSolid[s.color] ?? "bg-brand ring-brand"} text-white` : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
              )}
            >
              {s.id !== section?.id && <span aria-hidden className={cx("mr-2 size-2 rounded-full", sectionSolid[s.color]?.split(" ")[0])} />}
              {gradeSectionName(s)}
            </Link>
          ))}
        </nav>
        <form className="ml-auto flex items-end gap-2">
          <input type="hidden" name="seccion" value={section?.id} />
          <label className="text-sm">
            <span className="sr-only">Fecha</span>
            <input type="date" name="fecha" defaultValue={date} max={todayKey()} className={cx(inputClass, "h-9 py-1.5")} />
          </label>
          <button className="h-9 rounded-lg px-3 text-sm font-medium text-brand ring-1 ring-inset ring-line-strong hover:bg-canvas">Ver</button>
        </form>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div>
            <h2 className="font-semibold">{section ? gradeSectionName(section) : "Sin secciones"}</h2>
            <p className="text-sm text-ink-2">{capitalize(dateLabel(d, { weekday: "long", day: "numeric", month: "long" }))}</p>
          </div>
          <span className={cx("text-sm font-medium", taken ? "text-ok" : "text-warn")}>{weekend ? "Fin de semana" : taken ? "Lista pasada" : "Falta pasar lista"}</span>
        </div>
        {section && (
          <AttendanceForm
            key={`${section.id}-${date}`}
            sectionId={section.id}
            date={date}
            alreadyTaken={taken}
            rows={students.map((s) => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              color: section.color,
              allergies: s.allergies,
              support: ADAPTATION_SHORT[s.adaptation] ? `${ADAPTATION_SHORT[s.adaptation]}${s.adaptationNote ? `: ${s.adaptationNote}` : ""}` : null,
              status: s.attendance[0]?.status ?? (s.absenceNotices[0] ? (s.absenceNotices[0].reason === "Llegará tarde" ? "LATE" : "EXCUSED") : null),
              notice: s.absenceNotices[0] ? `${s.absenceNotices[0].reason}${s.absenceNotices[0].note ? `: ${s.absenceNotices[0].note}` : ""}` : null,
              note: s.attendance[0]?.note ?? null,
            }))}
          />
        )}
      </Card>
    </div>
  );
}
