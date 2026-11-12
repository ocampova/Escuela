import type { Metadata } from "next";
import { ClipboardList } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents } from "@/lib/queries";
import { keyToDate, todayKey } from "@/lib/format";
import { Card, EmptyState, SectionHeading } from "@/components/ui";
import { HomeworkRow } from "@/components/homework-row";

export const metadata: Metadata = { title: "Tareas" };

export default async function FamilyHomework() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const today = keyToDate(todayKey());
  const list = await prisma.homework.findMany({
    where: { sectionId: { in: students.map((s) => s.sectionId) }, dueDate: { gte: today } },
    include: { subject: true },
    orderBy: { dueDate: "asc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold">Tareas</h1>
      <p className="mt-1 text-sm text-ink-2">Lo que la docente dejó para la casa, por fecha de entrega.</p>
      {list.length === 0 && (
        <Card className="mt-5">
          <EmptyState icon={<ClipboardList className="size-5" />} title="No hay tareas pendientes">Cuando la docente publique una tarea, aparecerá aquí y le llegará una notificación.</EmptyState>
        </Card>
      )}
      {students.map((s) => {
        const mine = list.filter((h) => h.sectionId === s.sectionId);
        if (!mine.length) return null;
        return (
          <section key={s.id} className="mt-6">
            <SectionHeading title={students.length > 1 ? s.firstName : "Próximas entregas"} />
            <Card className="divide-y divide-line">
              {mine.map((h) => <HomeworkRow key={h.id} h={h} />)}
            </Card>
          </section>
        );
      })}
    </div>
  );
}
