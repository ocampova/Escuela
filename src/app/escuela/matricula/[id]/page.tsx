import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AlertTriangle, ArrowLeft, FileText, MessageCircle, Phone } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dateLabel, dateTimeLabel, gradeSectionName } from "@/lib/format";
import { ActionForm } from "@/components/action-form";
import { Badge, ButtonLink, Card, Field, SectionHeading, buttonClass, inputClass } from "@/components/ui";
import { enrollApplicant, updateApplicant } from "../actions";
import { STATUS } from "../status";
import { FORMAL_STEPS } from "@/lib/enrollment";

export const metadata: Metadata = { title: "Solicitud de matrícula" };

function age(birth: Date) {
  const now = new Date();
  let y = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) y--;
  return y;
}

export default async function ApplicantPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela");
  const a = await prisma.applicant.findFirst({
    where: { id, schoolId: user.schoolId },
    include: { grade: { include: { level: true } }, documents: { select: { id: true, kind: true, filename: true, size: true } } },
  });
  if (!a) notFound();
  const sections = await prisma.section.findMany({
    where: { schoolYear: { schoolId: user.schoolId, active: true }, ...(a.gradeId ? { gradeId: a.gradeId } : {}) },
    include: { grade: true, _count: { select: { students: true } } },
    orderBy: { name: "asc" },
  });
  const phone = a.guardianPhone.replace(/\D/g, "");
  const wa = `https://wa.me/${phone.length === 8 ? `506${phone}` : phone}?text=${encodeURIComponent(`Hola, ${a.guardianName.split(" ")[0]}. Le saluda San Cayetano School sobre la solicitud de matrícula de ${a.childFirstName}.`)}`;

  const child: [string, string][] = [
    ["Grado solicitado", a.grade ? `${a.grade.name} (${a.grade.level.name}), curso ${a.forYear}` : "Sin definir"],
    ["Nacimiento", `${dateLabel(a.childBirthDate, { day: "numeric", month: "long", year: "numeric" })} · ${age(a.childBirthDate)} años`],
    ["Cédula", a.childIdNumber ?? "Sin dato"],
    ["Escuela anterior", a.previousSchool ?? "Sin dato"],
    ["Traslado", a.transfer ? "Sí, viene de otra institución" : "No"],
  ];
  const steps = FORMAL_STEPS.filter((s) => !s.transferOnly || a.transfer);
  const done = steps.filter((s) => a.checklist.includes(s.key)).length;
  const guardian: [string, string][] = [
    ["Nombre", `${a.guardianName} (${a.relationship})`],
    ["Correo", a.guardianEmail],
    ["Teléfono", a.guardianPhone],
    ["Cédula", a.guardianIdNumber ?? "Sin dato"],
  ];

  return (
    <div>
      <Link href="/escuela/matricula" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Matrícula
      </Link>
      <div className="mt-3 mb-8 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">
            {a.childFirstName} {a.childLastName}
          </h1>
          <p className="mt-1 text-sm text-ink-2">Solicitud recibida el {dateTimeLabel(a.createdAt, { day: "numeric", month: "long" })}</p>
        </div>
        <Badge tone={STATUS[a.status].tone}>{STATUS[a.status].label}</Badge>
        <a href={wa} target="_blank" rel="noreferrer" className={buttonClass("secondary")}>
          <MessageCircle className="size-4" aria-hidden /> WhatsApp
        </a>
        <a href={`tel:${a.guardianPhone}`} className={buttonClass("secondary")}>
          <Phone className="size-4" aria-hidden /> Llamar
        </a>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-8">
          {[
            ["Niño o niña", child],
            ["Encargado", guardian],
          ].map(([title, rows]) => (
            <section key={title as string}>
              <SectionHeading title={title as string} />
              <Card>
                <dl className="divide-y divide-line">
                  {(rows as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                      <dt className="text-ink-2">{k}</dt>
                      <dd className="text-right font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </Card>
            </section>
          ))}
          {a.allergies && (
            <p className="flex items-center gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
              <AlertTriangle className="size-4" aria-hidden /> Salud: {a.allergies}
            </p>
          )}
          {a.message && (
            <section>
              <SectionHeading title="Mensaje de la familia" />
              <Card className="p-4 text-[15px] whitespace-pre-line">{a.message}</Card>
            </section>
          )}
          <section>
            <SectionHeading title="Documentos" />
            <Card className="divide-y divide-line">
              {a.documents.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">La familia no adjuntó documentos.</p>}
              {a.documents.map((d) => (
                <a key={d.id} href={`/escuela/matricula/documento/${d.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-canvas">
                  <FileText className="size-4 shrink-0 text-brand" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{d.kind}</span>
                    <span className="block truncate text-xs text-ink-3">{d.filename}</span>
                  </span>
                  <span className="tabular text-xs text-ink-3">{Math.max(1, Math.round(d.size / 1024))} KB</span>
                </a>
              ))}
            </Card>
          </section>
        </div>

        <aside className="space-y-6">
          {a.status === "ENROLLED" ? (
            <Card className="p-5">
              <p className="font-semibold text-ok">Matriculado</p>
              <p className="mt-1 text-sm text-ink-2">Ya es alumno de la escuela. Desde su ficha puede invitar a la familia.</p>
              {a.studentId && <ButtonLink href={`/escuela/alumnos/${a.studentId}`} className="mt-4 w-full">Ver ficha del alumno</ButtonLink>}
            </Card>
          ) : (
            <>
              <Card className="p-5">
                <h2 className="mb-4 font-semibold">Seguimiento</h2>
                <ActionForm action={updateApplicant} submitLabel="Guardar" resetOnOk={false}>
                  <input type="hidden" name="id" value={a.id} />
                  <Field label="Estado" htmlFor="status">
                    <select id="status" name="status" defaultValue={a.status} className={inputClass}>
                      {Object.entries(STATUS)
                        .filter(([k]) => k !== "ENROLLED")
                        .map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                    </select>
                  </Field>
                  <fieldset>
                    <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium">
                      Formalización
                      <span className="tabular text-xs font-normal text-ink-2">
                        {done} de {steps.length}
                      </span>
                    </legend>
                    <div className="space-y-1.5">
                      {steps.map((st) => (
                        <label key={st.key} className="flex items-start gap-2 text-sm">
                          <input type="checkbox" name="checklist" value={st.key} defaultChecked={a.checklist.includes(st.key)} className="mt-0.5 size-4" />
                          <span>{st.label}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <Field label="Notas internas" htmlFor="staffNotes" hint="Solo las ve el personal.">
                    <textarea id="staffNotes" name="staffNotes" rows={4} defaultValue={a.staffNotes ?? ""} className={inputClass} placeholder="Ej.: visita el jueves a las 10:00" />
                  </Field>
                </ActionForm>
              </Card>
              <Card className="p-5">
                <h2 className="mb-1 font-semibold">Matricular</h2>
                <p className="mb-4 text-sm text-ink-2">
                  Crea al alumno, la cuenta del encargado y el cobro de matrícula {a.forYear} (con descuento si es agosto o setiembre). Después podrá invitar a la familia.
                </p>
                {done < steps.length && (
                  <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
                    Faltan {steps.length - done} requisitos de formalización.
                  </p>
                )}
                {sections.length === 0 ? (
                  <p className="text-sm text-warn">No hay secciones abiertas para este grado. Créelas en Configuración.</p>
                ) : (
                  <ActionForm action={enrollApplicant} submitLabel="Matricular" pendingLabel="Matriculando…" resetOnOk={false}>
                    <input type="hidden" name="id" value={a.id} />
                    <Field label="Sección" htmlFor="sectionId">
                      <select id="sectionId" name="sectionId" className={inputClass}>
                        {sections.map((s) => (
                          <option key={s.id} value={s.id}>
                            {gradeSectionName(s)} ({s._count.students} alumnos)
                          </option>
                        ))}
                      </select>
                    </Field>
                  </ActionForm>
                )}
              </Card>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
