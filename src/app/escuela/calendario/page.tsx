import type { Metadata } from "next";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { capitalize, dateTimeLabel, dayKey, gradeSectionName, timeLabel, todayKey } from "@/lib/format";
import { Badge, Card, PageHeader, SectionHeading } from "@/components/ui";
import { EventDateTile, KIND_LABEL } from "@/components/event-tile";
import { EventForm } from "./event-form";

export const metadata: Metadata = { title: "Calendario" };

export default async function StaffCalendar() {
  const user = await requireStaff();
  const manager = isManager(user);
  const sections = await staffSections(user);
  const levels = manager ? await prisma.level.findMany({ where: { schoolId: user.schoolId }, orderBy: { order: "asc" } }) : [];
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const events = await prisma.event.findMany({
    where: { schoolId: user.schoolId, startsAt: { gte: from } },
    include: { level: true, section: { include: { grade: true } } },
    orderBy: { startsAt: "asc" },
  });
  const months = new Map<string, typeof events>();
  for (const e of events) {
    const k = dayKey(e.startsAt).slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), e]);
  }
  const targets = [
    ...(manager ? [{ value: "school", label: "Toda la escuela" }] : []),
    ...levels.map((l) => ({ value: `level:${l.id}`, label: `Todo ${l.name}` })),
    ...sections.map((s) => ({ value: `section:${s.id}`, label: gradeSectionName(s) })),
  ];

  return (
    <div>
      <PageHeader title="Calendario" description="Lo que agregue aquí lo ven las familias del grupo elegido." />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {[...months.entries()].map(([k, list]) => (
            <section key={k}>
              <SectionHeading title={capitalize(dateTimeLabel(list[0].startsAt, { month: "long", year: "numeric" }))} />
              <Card className="divide-y divide-line">
                {list.map((e) => (
                  <div key={e.id} className="flex items-center gap-4 px-4 py-3">
                    <EventDateTile date={e.startsAt} kind={e.kind} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{e.title}</p>
                      <p className="text-sm text-ink-2">
                        {capitalize(dateTimeLabel(e.startsAt, { weekday: "long" }))}
                        {e.allDay ? " · Todo el día" : ` · ${timeLabel(e.startsAt)}`}
                        {e.description ? ` · ${e.description}` : ""}
                      </p>
                    </div>
                    <div className="hidden shrink-0 gap-2 sm:flex">
                      <Badge>{KIND_LABEL[e.kind] ?? "Evento"}</Badge>
                      <Badge tone="brand">{e.section ? gradeSectionName(e.section) : e.level ? e.level.name : "Toda la escuela"}</Badge>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
        <aside>
          <Card className="p-5 lg:sticky lg:top-8">
            <h2 className="mb-4 font-semibold">Agregar evento</h2>
            <EventForm targets={targets} today={todayKey()} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
