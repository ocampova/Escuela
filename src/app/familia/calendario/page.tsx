import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { eventFilter, guardianStudents } from "@/lib/queries";
import { capitalize, dateTimeLabel, dayKey, gradeSectionName, timeLabel } from "@/lib/format";
import { Badge, Card, EmptyState } from "@/components/ui";
import { EventDateTile, KIND_LABEL } from "@/components/event-tile";
import { CalendarSubscribe } from "@/components/calendar-subscribe";
import { calendarLinks, calendarToken } from "@/lib/ics";

import { i18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Calendario") };
}

export default async function FamilyCalendar() {
  const user = await requireGuardian();
  const { t, locale } = await i18n();
  const students = await guardianStudents(user.id);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const events = await prisma.event.findMany({
    where: { schoolId: user.schoolId, startsAt: { gte: from }, ...eventFilter(students) },
    include: { section: { include: { grade: true } }, level: true },
    orderBy: { startsAt: "asc" },
  });
  const links = calendarLinks(await calendarToken(user.id));

  const months = new Map<string, typeof events>();
  for (const e of events) {
    const k = dayKey(e.startsAt).slice(0, 7);
    months.set(k, [...(months.get(k) ?? []), e]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{t("Calendario")}</h1>
      <p className="mt-1 text-sm text-ink-2">{t("Actividades, reuniones y fechas importantes de sus hijos.")}</p>
      <CalendarSubscribe links={links} className="mt-5" locale={locale} />
      {events.length === 0 && (
        <Card className="mt-5">
          <EmptyState icon={<CalendarDays className="size-5" />} title={t("No hay eventos próximos")}>
            {t("Cuando la escuela agende una actividad, aparecerá aquí.")}
          </EmptyState>
        </Card>
      )}
      {[...months.entries()].map(([k, list]) => (
        <section key={k} className="mt-6">
          <h2 className="mb-3 text-[15px] font-semibold">{capitalize(dateTimeLabel(list[0].startsAt, { month: "long", year: "numeric" }))}</h2>
          <Card className="divide-y divide-line">
            {list.map((e) => (
              <div key={e.id} className="flex gap-3 p-4">
                <EventDateTile date={e.startsAt} kind={e.kind} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-sm text-ink-2">
                    {capitalize(dateTimeLabel(e.startsAt, { weekday: "long" }))}
                    {e.allDay ? ` · ${t("Todo el día")}` : ` · ${timeLabel(e.startsAt)}${e.endsAt ? ` ${t("a")} ${timeLabel(e.endsAt)}` : ""}`}
                  </p>
                  {e.description && <p className="mt-1.5 text-sm text-ink-2">{e.description}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge>{t(KIND_LABEL[e.kind] ?? "Evento")}</Badge>
                    {e.section && <Badge tone="brand">{gradeSectionName(e.section)}</Badge>}
                    {e.level && <Badge tone="brand">{t(e.level.name)}</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
