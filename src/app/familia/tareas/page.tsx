import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents } from "@/lib/queries";
import { keyToDate, todayKey } from "@/lib/format";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { HomeworkRow } from "@/components/homework-row";

import { i18n } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Tareas") };
}

export default async function FamilyHomework() {
  const user = await requireGuardian();
  const { t } = await i18n();
  const students = await guardianStudents(user.id);
  const today = keyToDate(todayKey());
  const list = await prisma.homework.findMany({
    where: { sectionId: { in: students.map((s) => s.sectionId) }, dueDate: { gte: today } },
    include: { subject: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">{t("Tareas")}</h1>
      <p className="mt-1 text-sm text-ink-2">{t("Lo que la docente dejó para la casa, por fecha de entrega.")}</p>
      {list.length === 0 && (
        <Card className="mt-5">
          <EmptyState icon={<ClipboardList className="size-5" />} title={t("No hay tareas pendientes")}>{t("Cuando la docente publique una tarea, aparecerá aquí y le llegará una notificación.")}</EmptyState>
        </Card>
      )}
      {students.map((s) => {
        const mine = list.filter((h) => h.sectionId === s.sectionId);
        if (!mine.length) return null;
        return (
          <section key={s.id} className="mt-6">
            <SectionHeading title={students.length > 1 ? s.firstName : t("Próximas entregas")} />
            <Card className="divide-y divide-line">
              {mine.map((h) => <HomeworkRow key={h.id} h={h} t={t} />)}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
