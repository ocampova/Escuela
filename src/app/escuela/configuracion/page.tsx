import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateLabel } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { InviteButton } from "@/components/invite-button";
import { Avatar, Badge, Card, Field, PageHeader, SectionHeading, cx, inputClass, sectionSolid } from "@/components/ui";
import { addGrade, addLevel, addSection, addStaff, saveSchoolYear, updateSection } from "./actions";
import { ActiveToggle } from "./active-toggle";

export const metadata: Metadata = { title: "Configuración" };

const TABS = [
  { key: "estructura", label: "Niveles y secciones" },
  { key: "personal", label: "Personal" },
  { key: "curso", label: "Curso lectivo" },
];
const ROLE: Record<string, string> = { ADMIN: "Dirección", STAFF: "Secretaría", TEACHER: "Docente" };
const COLOR_LABEL: Record<string, string> = { orange: "Naranja", green: "Verde", blue: "Azul" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela");
  const { tab = "estructura" } = await searchParams;

  const [year, levels, staff] = await Promise.all([
    prisma.schoolYear.findFirst({ where: { schoolId: user.schoolId, active: true } }),
    prisma.level.findMany({
      where: { schoolId: user.schoolId },
      orderBy: { order: "asc" },
      include: {
        grades: {
          orderBy: { order: "asc" },
          include: { sections: { where: { schoolYear: { active: true } }, orderBy: { name: "asc" }, include: { _count: { select: { students: true } } } } },
        },
      },
    }),
    prisma.user.findMany({ where: { schoolId: user.schoolId, role: { not: "GUARDIAN" } }, orderBy: [{ role: "asc" }, { name: "asc" }], include: { teacherOf: { include: { grade: true } } } }),
  ]);
  const teachers = staff.filter((s) => s.role === "TEACHER" && s.active);
  const grades = levels.flatMap((l) => l.grades.map((g) => ({ ...g, levelName: l.name })));

  return (
    <div>
      <PageHeader title="Configuración" description="Estructura de la escuela, cuentas del personal y curso lectivo." />
      <nav aria-label="Secciones de configuración" className="mb-6 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/escuela/configuracion?tab=${t.key}`}
            aria-current={tab === t.key ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-3 pb-2.5 text-sm font-medium transition-colors",
              tab === t.key ? "border-brand text-brand" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "estructura" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            {levels.map((l) => (
              <section key={l.id}>
                <SectionHeading title={l.name} />
                <Card className="divide-y divide-line">
                  {l.grades.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">Todavía no tiene grados.</p>}
                  {l.grades.map((g) => (
                    <div key={g.id} className="px-4 py-3">
                      <p className="font-medium">{g.name}</p>
                      {g.sections.length === 0 && <p className="mt-1 text-sm text-ink-3">Sin secciones este curso lectivo.</p>}
                      <ul className="mt-2 space-y-2">
                        {g.sections.map((s) => (
                          <li key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-canvas px-3 py-2">
                            <span aria-hidden className={cx("size-3 rounded-full", sectionSolid[s.color]?.split(" ")[0])} />
                            <span className="min-w-[110px] text-sm font-medium">
                              {g.name} {s.name}
                              <span className="block text-xs font-normal text-ink-3">{s._count.students} alumnos</span>
                            </span>
                            <ActionForm action={updateSection} submitLabel="Guardar" variant="secondary" inline resetOnOk={false} className="ml-auto">
                              <input type="hidden" name="id" value={s.id} />
                              <label className="text-xs text-ink-2">
                                <span className="sr-only">Color</span>
                                <select name="color" defaultValue={s.color} className={cx(inputClass, "h-9 w-auto py-1 text-sm")}>
                                  {Object.entries(COLOR_LABEL).map(([v, label]) => (
                                    <option key={v} value={v}>{label}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="text-xs text-ink-2">
                                <span className="sr-only">Docente guía</span>
                                <select name="teacherId" defaultValue={s.teacherId ?? ""} className={cx(inputClass, "h-9 w-auto py-1 text-sm")}>
                                  <option value="">Sin docente</option>
                                  {teachers.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                  ))}
                                </select>
                              </label>
                            </ActionForm>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </Card>
              </section>
            ))}
          </div>
          <aside className="space-y-6">
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Nueva sección</h2>
              <ActionForm action={addSection} submitLabel="Crear sección">
                <Field label="Grado" htmlFor="sec-grade">
                  <select id="sec-grade" name="gradeId" required className={inputClass}>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>{g.levelName} · {g.name}</option>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Sección" htmlFor="sec-name">
                    <input id="sec-name" name="name" required placeholder="A" className={inputClass} />
                  </Field>
                  <Field label="Color" htmlFor="sec-color">
                    <select id="sec-color" name="color" className={inputClass}>
                      {Object.entries(COLOR_LABEL).map(([v, label]) => (
                        <option key={v} value={v}>{label}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <Field label="Docente guía" htmlFor="sec-teacher">
                  <select id="sec-teacher" name="teacherId" className={inputClass}>
                    <option value="">Asignar después</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </Field>
              </ActionForm>
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Nuevo grado</h2>
              <ActionForm action={addGrade} submitLabel="Agregar grado" variant="secondary">
                <Field label="Nivel" htmlFor="gr-level">
                  <select id="gr-level" name="levelId" className={inputClass}>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Nombre" htmlFor="gr-name">
                  <input id="gr-name" name="name" required placeholder="Ej.: Segundo grado" className={inputClass} />
                </Field>
              </ActionForm>
            </Card>
            <Card className="p-5">
              <h2 className="mb-4 font-semibold">Nuevo nivel</h2>
              <ActionForm action={addLevel} submitLabel="Agregar nivel" variant="secondary">
                <Field label="Nombre" htmlFor="lv-name">
                  <input id="lv-name" name="name" required placeholder="Ej.: Secundaria" className={inputClass} />
                </Field>
              </ActionForm>
            </Card>
          </aside>
        </div>
      )}

      {tab === "personal" && (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="divide-y divide-line">
            {staff.map((s) => (
              <div key={s.id} className={cx("flex flex-wrap items-center gap-3 px-4 py-3", !s.active && "opacity-60")}>
                <Avatar name={s.name} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{s.name}</p>
                  <p className="truncate text-sm text-ink-2">
                    {s.email}
                    {s.teacherOf.length > 0 && ` · ${s.teacherOf.map((t) => `${t.grade.name} ${t.name}`).join(", ")}`}
                  </p>
                </div>
                <Badge tone={s.role === "TEACHER" ? "neutral" : "brand"}>{ROLE[s.role]}</Badge>
                {!s.passwordHash && s.active && <Badge tone="warn">Sin activar</Badge>}
                {!s.active && <Badge>Desactivada</Badge>}
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  {s.active && s.id !== user.id && <InviteButton userId={s.id} activated={!!s.passwordHash} />}
                  {s.role !== "ADMIN" && s.id !== user.id && <ActiveToggle userId={s.id} active={s.active} />}
                </div>
              </div>
            ))}
          </Card>
          <aside>
            <Card className="p-5">
              <h2 className="mb-1 font-semibold">Agregar personal</h2>
              <p className="mb-4 text-sm text-ink-2">Después de crear la cuenta, use «Invitar» para enviarle el enlace de activación.</p>
              <ActionForm action={addStaff} submitLabel="Crear cuenta">
                <Field label="Nombre completo" htmlFor="st-name">
                  <input id="st-name" name="name" required className={inputClass} />
                </Field>
                <Field label="Correo" htmlFor="st-email">
                  <input id="st-email" name="email" type="email" required className={inputClass} />
                </Field>
                <Field label="Teléfono" htmlFor="st-phone">
                  <input id="st-phone" name="phone" inputMode="tel" placeholder="8888-8888" className={inputClass} />
                </Field>
                <Field label="Rol" htmlFor="st-role">
                  <select id="st-role" name="role" className={inputClass}>
                    <option value="TEACHER">Docente</option>
                    <option value="STAFF">Secretaría</option>
                    {user.role === "ADMIN" && <option value="ADMIN">Dirección</option>}
                  </select>
                </Field>
              </ActionForm>
            </Card>
          </aside>
        </div>
      )}

      {tab === "curso" && (
        <Card className="max-w-lg p-5">
          <h2 className="mb-1 font-semibold">Curso lectivo activo</h2>
          <p className="mb-4 text-sm text-ink-2">
            {year ? `${year.name}: del ${dateLabel(year.startsOn, { day: "numeric", month: "long" })} al ${dateLabel(year.endsOn, { day: "numeric", month: "long", year: "numeric" })}.` : "Todavía no hay un curso lectivo configurado."}
          </p>
          <ActionForm action={saveSchoolYear} submitLabel="Guardar" resetOnOk={false}>
            <Field label="Nombre" htmlFor="sy-name">
              <input id="sy-name" name="name" required defaultValue={year?.name ?? `Curso lectivo ${new Date().getFullYear() + 1}`} className={inputClass} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicio" htmlFor="sy-start">
                <input id="sy-start" name="startsOn" type="date" required defaultValue={year?.startsOn.toISOString().slice(0, 10)} className={inputClass} />
              </Field>
              <Field label="Cierre" htmlFor="sy-end">
                <input id="sy-end" name="endsOn" type="date" required defaultValue={year?.endsOn.toISOString().slice(0, 10)} className={inputClass} />
              </Field>
            </div>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
