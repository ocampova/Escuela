import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { staffSections } from "@/lib/queries";
import { gradeSectionName } from "@/lib/format";
import { Card } from "@/components/ui";
import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Nuevo alumno" };

export default async function NewStudent() {
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela/alumnos");
  const sections = await staffSections(user);
  return (
    <div className="max-w-2xl">
      <Link href="/escuela/alumnos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Alumnos
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-semibold">Nuevo alumno</h1>
      <p className="mb-6 text-sm text-ink-2">Después de crearlo podrá agregar a los encargados e invitarlos.</p>
      <Card className="p-5 sm:p-6">
        <StudentForm sections={sections.map((s) => ({ id: s.id, label: gradeSectionName(s) }))} />
      </Card>
    </div>
  );
}
