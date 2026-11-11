import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, DoorOpen } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { capitalize, dateLabel, gradeSectionName, keyToDate, timeLabel, todayKey } from "@/lib/format";
import { Avatar, Card, EmptyState, PageHeader, cx } from "@/components/ui";
import { SectionPicker } from "@/components/section-picker";
import { VidaTabs } from "../vida-tabs";
import { PickupForm } from "./pickup-form";
import { undoPickup } from "../vida-actions";

export const metadata: Metadata = { title: "Salida" };

export default async function PickupPage({ searchParams }: { searchParams: Promise<{ seccion?: string }> }) {
  const user = await requireStaff();
  const sp = await searchParams;
  const sections = await staffSections(user);
  const section = sections.find((s) => s.id === sp.seccion) ?? sections[0];
  const day = keyToDate(todayKey());
  const students = section
    ? await prisma.student.findMany({
        where: { sectionId: section.id },
        include: {
          pickups: true,
          guardians: { include: { user: { select: { id: true, name: true } } }, orderBy: { isPrimary: "desc" } },
          pickupLogs: { where: { day }, include: { staff: { select: { name: true } } } },
          attendance: { where: { date: day } },
        },
        orderBy: [{ firstName: "asc" }],
      })
    : [];
  const absent = (s: (typeof students)[number]) => s.attendance[0]?.status === "ABSENT" || s.attendance[0]?.status === "EXCUSED";
  const present = students.filter((s) => !absent(s));
  const out = present.filter((s) => s.pickupLogs[0]);

  return (
    <div>
      <PageHeader title="Vida diaria" description="Lo que pasa en el aula, para que la familia lo sepa el mismo día." />
      <VidaTabs active="/escuela/salida" />
      <div className="mb-4">
        <SectionPicker sections={sections} current={section?.id} href={(id) => `/escuela/salida?seccion=${id}`} />
      </div>
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
          <div>
            <h2 className="font-semibold">{section ? gradeSectionName(section) : "Sin secciones"}</h2>
            <p className="text-sm text-ink-2">{capitalize(dateLabel(day, { weekday: "long", day: "numeric", month: "long" }))}</p>
          </div>
          <span className={cx("tabular text-sm font-medium", out.length === present.length && present.length ? "text-ok" : "text-ink-2")}>
            {out.length} de {present.length} ya salieron
          </span>
        </div>
        {students.length === 0 ? (
          <EmptyState icon={<DoorOpen className="size-5" />} title="No hay alumnos en esta sección">
            Aquí se registra quién recoge a cada niño.
          </EmptyState>
        ) : (
          <ul className="divide-y divide-line">
            {students.map((s) => {
              const log = s.pickupLogs[0];
              const name = `${s.firstName} ${s.lastName}`;
              return (
                <li key={s.id} className={cx("px-4 py-3", absent(s) && "opacity-55")}>
                  <div className="flex flex-wrap items-center gap-3">
                    <Avatar name={name} color={section!.color} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{name}</p>
                      {log ? (
                        <p className={cx("flex items-center gap-1.5 text-sm", log.kind === "OTHER" ? "text-warn" : "text-ok")}>
                          {log.kind === "OTHER" ? <AlertTriangle className="size-3.5 shrink-0" aria-hidden /> : <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />}
                          {timeLabel(log.at)} · {log.personName}
                          {log.relation ? ` (${log.relation.toLowerCase()})` : ""}
                        </p>
                      ) : (
                        <p className="text-sm text-ink-2">{absent(s) ? "Ausente hoy" : "En la escuela"}</p>
                      )}
                      {log?.note && <p className="text-xs text-ink-3">{log.note}</p>}
                    </div>
                    {log && (
                      <form action={undoPickup.bind(null, log.id)}>
                        <button className="text-sm font-medium text-ink-2 hover:text-danger">Deshacer</button>
                      </form>
                    )}
                  </div>
                  {!log && !absent(s) && (
                    <PickupForm
                      studentId={s.id}
                      studentName={s.firstName}
                      options={[
                        ...s.guardians.map((g) => ({ value: `g:${g.userId}`, name: g.user.name, detail: g.relationship })),
                        ...s.pickups.map((p) => ({ value: `a:${p.id}`, name: p.name, detail: `${p.relationship} · Cédula ${p.idNumber}` })),
                      ]}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
      <p className="mt-3 text-xs text-ink-3">Al registrar la salida, la familia recibe una notificación con la hora y quién lo recogió.</p>
    </div>
  );
}
