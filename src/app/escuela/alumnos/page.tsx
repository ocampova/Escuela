import { ADAPTATION_SHORT, STATUS_LABEL } from "@/lib/student";
import Link from "next/link";
import type { Metadata } from "next";
import { AlertTriangle, FileSpreadsheet, Plus, Search } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { gradeSectionName } from "@/lib/format";
import { Avatar, Badge, ButtonLink, Card, EmptyState, PageHeader, SectionChip, cx, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Alumnos" };

export default async function StudentsPage({ searchParams }: { searchParams: Promise<{ q?: string; seccion?: string; estado?: string; faltan?: string }> }) {
  const user = await requireStaff();
  const { q = "", seccion, estado, faltan } = await searchParams;
  const retired = estado === "retirados";
  const missingOnly = faltan === "mep";
  const sections = await staffSections(user);
  const ids = sections.map((s) => s.id).filter((id) => !seccion || id === seccion);
  const term = q.trim();
  const students = await prisma.student.findMany({
    where: {
      sectionId: { in: ids },
      status: retired ? { not: "ACTIVE" } : "ACTIVE",
      ...(missingOnly ? { OR: [{ sex: null }, { enrolledOn: null }, { nationality: null }] } : {}),
      ...(term
        ? {
            OR: [
              { firstName: { contains: term, mode: "insensitive" } },
              { lastName: { contains: term, mode: "insensitive" } },
              { idNumber: { contains: term } },
              { guardians: { some: { user: { name: { contains: term, mode: "insensitive" } } } } },
            ],
          }
        : {}),
    },
    include: { section: { include: { grade: true } }, guardians: { include: { user: true }, orderBy: { isPrimary: "desc" } } },
    orderBy: [{ section: { grade: { level: { order: "asc" } } } }, { section: { grade: { order: "asc" } } }, { firstName: "asc" }],
  });
  const [retiredCount, incomplete] = await Promise.all([
    prisma.student.count({ where: { sectionId: { in: ids }, status: { not: "ACTIVE" } } }),
    prisma.student.count({ where: { sectionId: { in: ids }, status: "ACTIVE", OR: [{ sex: null }, { enrolledOn: null }, { nationality: null }] } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Alumnos"
        description={`${students.length} ${students.length === 1 ? "alumno" : "alumnos"}${retired ? (students.length === 1 ? " retirado o trasladado" : " retirados o trasladados") : missingOnly ? " con datos del MEP incompletos" : ""}${seccion ? " en esta sección" : ""}`}
        actions={
          isManager(user) && (
            <>
              <ButtonLink href="/escuela/alumnos/importar" variant="secondary">
                <FileSpreadsheet className="size-4" aria-hidden /> Importar desde Excel
              </ButtonLink>
              <ButtonLink href="/escuela/alumnos/nuevo">
                <Plus className="size-4" aria-hidden /> Nuevo alumno
              </ButtonLink>
            </>
          )
        }
      />
      <form className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-[240px] flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Buscar por nombre, cédula o encargado" className={cx(inputClass, "pl-9")} />
        </label>
        <select name="seccion" defaultValue={seccion ?? ""} className={cx(inputClass, "w-auto")}>
          <option value="">Todas las secciones</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {gradeSectionName(s)} ({s._count.students})
            </option>
          ))}
        </select>
        {retired && <input type="hidden" name="estado" value="retirados" />}
        <button className="h-[44px] rounded-lg bg-surface px-4 text-sm font-medium ring-1 ring-inset ring-line-strong hover:bg-canvas">Filtrar</button>
      </form>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {(retired || missingOnly) && (
          <Link href="/escuela/alumnos" className="font-medium text-brand hover:underline">
            Ver alumnos activos
          </Link>
        )}
        {!retired && !missingOnly && incomplete > 0 && isManager(user) && (
          <Link href="/escuela/alumnos?faltan=mep" className="inline-flex items-center gap-1.5 font-medium text-warn hover:underline">
            <AlertTriangle className="size-4" aria-hidden /> {incomplete} {incomplete === 1 ? "alumno sin" : "alumnos sin"} datos completos para el MEP
          </Link>
        )}
        {!retired && retiredCount > 0 && (
          <Link href="/escuela/alumnos?estado=retirados" className="font-medium text-ink-2 hover:text-ink hover:underline">
            Retirados y trasladados ({retiredCount})
          </Link>
        )}
      </div>
      <Card className="overflow-x-auto">
        {students.length === 0 ? (
          <EmptyState icon={<Search className="size-5" />} title="Ningún alumno coincide">
            Pruebe con otro nombre o quite el filtro de sección.
          </EmptyState>
        ) : (
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-canvas text-left text-xs text-ink-2">
              <tr>
                <th className="px-4 py-2.5 font-medium">Alumno</th>
                <th className="px-4 py-2.5 font-medium">Sección</th>
                <th className="px-4 py-2.5 font-medium">Encargado principal</th>
                <th className="px-4 py-2.5 font-medium">Salud y apoyos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map((s) => (
                <tr key={s.id} className="transition-colors hover:bg-canvas">
                  <td className="px-4 py-3">
                    <Link href={`/escuela/alumnos/${s.id}`} className="flex items-center gap-3 font-medium hover:underline">
                      <Avatar name={`${s.firstName} ${s.lastName}`} color={s.section.color} size={32} />
                      <span>
                        {s.firstName} {s.lastName}
                        <span className="tabular block text-xs font-normal text-ink-3">{s.idNumber}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <SectionChip color={s.section.color} label={gradeSectionName(s.section)} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="block">{s.guardians[0]?.user.name}</span>
                    <span className="tabular text-xs text-ink-3">{s.guardians[0]?.user.phone}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      {s.allergies && (
                        <Badge tone="danger">
                          <AlertTriangle className="size-3.5" aria-hidden /> {s.allergies}
                        </Badge>
                      )}
                      {ADAPTATION_SHORT[s.adaptation] && <Badge tone="brand">{ADAPTATION_SHORT[s.adaptation]}</Badge>}
                      {s.status !== "ACTIVE" && <Badge tone="warn">{STATUS_LABEL[s.status]}</Badge>}
                      {!s.allergies && !ADAPTATION_SHORT[s.adaptation] && s.status === "ACTIVE" && <span className="text-ink-3">Sin alergias</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
