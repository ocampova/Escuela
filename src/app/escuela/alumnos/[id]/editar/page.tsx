import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { gradeSectionName } from "@/lib/format";
import { Card } from "@/components/ui";
import { StudentForm } from "../../student-form";

export const metadata: Metadata = { title: "Editar alumno" };

export default async function EditStudent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff();
  if (!isManager(user)) redirect(`/escuela/alumnos/${id}`);
  const sections = await staffSections(user);
  const student = await prisma.student.findFirst({ where: { id, sectionId: { in: sections.map((s) => s.id) } } });
  if (!student) notFound();
  return (
    <div className="max-w-2xl">
      <Link href={`/escuela/alumnos/${id}`} className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> {student.firstName} {student.lastName}
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-semibold">Editar datos</h1>
      <Card className="p-5 sm:p-6">
        <StudentForm student={student} sections={sections.map((s) => ({ id: s.id, label: gradeSectionName(s) }))} />
      </Card>
    </div>
  );
}
