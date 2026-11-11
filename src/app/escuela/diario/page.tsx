import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { capitalize, dateLabel, gradeSectionName, keyToDate, todayKey } from "@/lib/format";
import { Card, EmptyState, PageHeader, cx, inputClass } from "@/components/ui";
import { SectionPicker } from "@/components/section-picker";
import { VidaTabs } from "../vida-tabs";
import { DailyForm } from "./daily-form";

export const metadata: Metadata = { title: "Reporte diario" };

export default async function DailyPage({ searchParams }: { searchParams: Promise<{ seccion?: string; fecha?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const section = sections.find((s) => s.id === sp.seccion) ?? sections.find((s) => s.grade.level.name === "Preescolar") ?? sections[0];
  const date = sp.fecha && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) && sp.fecha <= todayKey() ? sp.fecha : todayKey();
  const d = keyToDate(date);

  const students = section
    ? await prisma.student.findMany({
        where: { sectionId: section.id },
        include: { dailyReports: { where: { day: d } }, attendance: { where: { date: d } } },
        orderBy: [{ firstName: "asc" }],
      })
    : [];
  const reports = students.flatMap((s) => s.dailyReports);
  const sent = reports.filter((r) => r.sentAt).length;

  return (
    <div>
      <PageHeader title="Vida diaria" description="Lo que pasa en el aula, para que la familia lo sepa el mismo día." />
      <VidaTabs active="/escuela/diario" />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SectionPicker sections={sections} current={section?.id} href={(id) => `/escuela/diario?seccion=${id}&fecha=${date}`} />
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
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div>
            <h2 className="font-semibold">{section ? gradeSectionName(section) : "Sin secciones"}</h2>
            <p className="text-sm text-ink-2">{capitalize(dateLabel(d, { weekday: "long", day: "numeric", month: "long" }))}</p>
          </div>
          <span className={cx("text-sm font-medium", sent ? "text-ok" : "text-ink-2")}>
            {sent ? `Enviado a ${sent} de ${students.length}` : reports.length ? "Borrador sin enviar" : "Sin llenar"}
          </span>
        </div>
        {!section || students.length === 0 ? (
          <EmptyState title="No hay alumnos en esta sección">Cuando se matriculen alumnos, podrá llenar su reporte aquí.</EmptyState>
        ) : (
          <DailyForm
            key={`${section.id}-${date}`}
            sectionId={section.id}
            date={date}
            activity={reports.find((r) => r.activity)?.activity ?? ""}
            rows={students.map((s) => ({
              id: s.id,
              name: `${s.firstName} ${s.lastName}`,
              color: section.color,
              absent: s.attendance[0]?.status === "ABSENT" || s.attendance[0]?.status === "EXCUSED",
              sent: !!s.dailyReports[0]?.sentAt,
              values: {
                mood: s.dailyReports[0]?.mood ?? "",
                meal: s.dailyReports[0]?.meal ?? "",
                participation: s.dailyReports[0]?.participation ?? "",
                bathroom: s.dailyReports[0]?.bathroom ?? "",
              },
              note: s.dailyReports[0]?.note ?? "",
            }))}
          />
        )}
      </Card>
    </div>
  );
}
