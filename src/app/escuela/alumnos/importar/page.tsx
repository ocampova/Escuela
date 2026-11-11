import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { ImportWizard } from "./import-wizard";

export const metadata: Metadata = { title: "Importar alumnos" };

export default async function ImportPage() {
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela/alumnos");
  return (
    <div className="max-w-4xl">
      <Link href="/escuela/alumnos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Alumnos
      </Link>
      <h1 className="mt-2 mb-1 text-2xl font-semibold">Importar alumnos desde Excel</h1>
      <p className="mb-6 text-sm text-ink-2">Cargue la lista de matrícula completa de una vez. Se crean los alumnos y las cuentas de sus encargados.</p>
      <ImportWizard />
    </div>
  );
}
