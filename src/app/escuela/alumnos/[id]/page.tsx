import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowLeft, DoorOpen, Mail, MessageCircle, Pencil, Phone, UserCheck, UserPlus } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { METHOD_LABEL, staffSections, statementFor } from "@/lib/queries";
import { crc, dateLabel, gradeSectionName, money, usd } from "@/lib/format";
import { Avatar, Badge, ButtonLink, Card, Field, SectionChip, SectionHeading, inputClass } from "@/components/ui";
import { ActionForm } from "@/components/action-form";
import { InviteButton } from "@/components/invite-button";
import { addGuardian, addPickup, reactivateStudent, registerExit } from "../actions";
import { ADAPTATION_LABEL, ADAPTATION_SHORT, EXIT_REASONS, SEX_LABEL, STATUS_LABEL } from "@/lib/student";
import { todayKey } from "@/lib/format";
import { RemoveButton } from "../remove-button";
import { AttendanceStrip } from "@/components/attendance-strip";

export default async function StaffStudent({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuevo?: string }> }) {
  const { id } = await params;
  const { nuevo } = await searchParams;
  const user = await requireStaff();
  const sections = await staffSections(user);
  const s = await prisma.student.findFirst({
    where: { id, sectionId: { in: sections.map((x) => x.id) } },
    include: {
      section: { include: { grade: true, teacher: true } },
      guardians: { include: { user: true }, orderBy: { isPrimary: "desc" } },
      pickups: true,
      attendance: { orderBy: { date: "desc" }, take: 20 },
    },
  });
  if (!s) notFound();
  const manager = isManager(user);
  const statement = manager ? (await statementFor([s.id])).get(s.id)! : null;

  const info: [string, string][] = [
    ["Cédula", s.idNumber ?? "Sin dato"],
    ["Nacimiento", dateLabel(s.birthDate, { day: "numeric", month: "long", year: "numeric" })],
    ["Sexo", s.sex ? SEX_LABEL[s.sex] : "Sin dato"],
    ["Nacionalidad", s.nationality ?? "Sin dato"],
    ["Ingreso a la escuela", s.enrolledOn ? dateLabel(s.enrolledOn, { day: "numeric", month: "long", year: "numeric" }) : "Sin dato"],
    ["Repite el grado", s.repeating ? "Sí" : "No"],
    ["Adecuación curricular", ADAPTATION_LABEL[s.adaptation] + (s.adaptationNote ? `: ${s.adaptationNote}` : "")],
    ["Tipo de sangre", s.bloodType ?? "Sin dato"],
    ["Docente guía", s.section.teacher?.name ?? "Sin asignar"],
    ["Fotos", s.photoConsent === true ? "Autorizadas por la familia" : s.photoConsent === false ? "No autorizadas" : "Sin respuesta de la familia"],
    ...(s.medicalNotes ? ([["Notas médicas", s.medicalNotes]] as [string, string][]) : []),
  ];

  return (
    <div>
      <Link href="/escuela/alumnos" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden /> Alumnos
      </Link>
      {nuevo && (
        <p role="status" className="ack-in mt-3 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          Alumno creado. Agregue a los encargados abajo y envíeles la invitación.
        </p>
      )}
      <div className="mt-3 mb-8 flex flex-wrap items-center gap-4">
        <Avatar name={`${s.firstName} ${s.lastName}`} color={s.section.color} size={64} />
        <div>
          <h1 className="text-2xl font-semibold">
            {s.firstName} {s.lastName}
          </h1>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <SectionChip color={s.section.color} label={gradeSectionName(s.section)} />
            {s.allergies && (
              <Badge tone="danger">
                <AlertTriangle className="size-3.5" aria-hidden /> Alergia: {s.allergies}
              </Badge>
            )}
            {ADAPTATION_SHORT[s.adaptation] && <Badge tone="brand">{ADAPTATION_SHORT[s.adaptation]}</Badge>}
            {s.repeating && <Badge>Repite el grado</Badge>}
            {s.status !== "ACTIVE" && <Badge tone="warn">{STATUS_LABEL[s.status]}</Badge>}
          </div>
        </div>
        {manager && (
          <ButtonLink href={`/escuela/alumnos/${s.id}/editar`} variant="secondary" className="ml-auto">
            <Pencil className="size-4" aria-hidden /> Editar datos
          </ButtonLink>
        )}
      </div>

      {s.status !== "ACTIVE" && (
        <div className="mb-8 flex flex-wrap items-center gap-3 rounded-xl bg-warn-soft px-4 py-3 text-sm">
          <DoorOpen className="size-4 shrink-0 text-warn" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-medium text-warn">{STATUS_LABEL[s.status]}</span>
            {s.exitDate && ` el ${dateLabel(s.exitDate, { day: "numeric", month: "long", year: "numeric" })}`}
            {s.exitReason && ` · ${s.exitReason}`}. No aparece en asistencia, notas ni cobros; su expediente se conserva.
          </p>
          {manager && (
            <form action={reactivateStudent.bind(null, s.id)}>
              <button className="h-9 rounded-lg bg-surface px-3 text-sm font-medium text-brand ring-1 ring-inset ring-line-strong hover:bg-canvas">Reactivar</button>
            </form>
          )}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-8">
          <section>
            <SectionHeading title="Datos" />
            <Card>
              <dl className="divide-y divide-line">
                {info.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                    <dt className="text-ink-2">{k}</dt>
                    <dd className="min-w-0 text-right font-medium break-words">{v}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          </section>
          <section>
            <SectionHeading title="Encargados" />
            <Card className="divide-y divide-line">
              {s.guardians.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">Todavía no tiene encargados.</p>}
              {s.guardians.map((g) => (
                <div key={g.userId} className="flex gap-3 px-4 py-3.5">
                  <Avatar name={g.user.name} size={36} className="shrink-0" />
                  <div className="min-w-0 flex-1 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium">
                          {g.user.name}
                          {!g.user.passwordHash && <Badge tone="warn" className="ml-2 align-middle">Sin activar</Badge>}
                        </p>
                        <p className="text-ink-2">
                          {g.relationship}
                          {g.isPrimary ? " · Encargado principal" : ""}
                        </p>
                      </div>
                      {manager && <RemoveButton kind="guardian" studentId={s.id} id={g.userId} label={g.user.name} />}
                    </div>
                    <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-ink-2">
                      <span className="inline-flex min-w-0 items-center gap-1.5 break-all">
                        <Mail className="size-3.5 shrink-0" aria-hidden /> {g.user.email}
                      </span>
                      {g.user.phone && (
                        <a href={`tel:${g.user.phone}`} className="tap inline-flex items-center gap-1.5 hover:text-ink">
                          <Phone className="size-3.5 shrink-0" aria-hidden /> {g.user.phone}
                        </a>
                      )}
                    </p>
                    {(user.school.messagingEnabled || manager) && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {user.school.messagingEnabled && (
                          <ButtonLink href={`/escuela/mensajes/nuevo?alumno=${s.id}&encargado=${g.userId}`} variant="secondary" size="sm" aria-label={`Escribir a ${g.user.name}`}>
                            <MessageCircle className="size-4" aria-hidden /> Escribir
                          </ButtonLink>
                        )}
                        {manager && <InviteButton userId={g.userId} activated={!!g.user.passwordHash} />}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </Card>
            {manager && (
              <details className="group mt-3 rounded-xl bg-surface shadow-card">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-brand">
                  <UserPlus className="size-4" aria-hidden /> Agregar encargado
                </summary>
                <div className="border-t border-line p-4">
                  <ActionForm action={addGuardian} submitLabel="Agregar">
                    <input type="hidden" name="studentId" value={s.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nombre completo" htmlFor="g-name"><input id="g-name" name="name" required className={inputClass} /></Field>
                      <Field label="Parentesco" htmlFor="g-rel"><input id="g-rel" name="relationship" required placeholder="Madre, Padre, Abuela…" className={inputClass} /></Field>
                      <Field label="Correo" htmlFor="g-email" hint="Si ya tiene cuenta por un hermano, se vincula."><input id="g-email" name="email" type="email" required className={inputClass} /></Field>
                      <Field label="Teléfono" htmlFor="g-phone"><input id="g-phone" name="phone" inputMode="tel" placeholder="8888-8888" className={inputClass} /></Field>
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" name="isPrimary" defaultChecked={s.guardians.length === 0} className="size-4" /> Encargado principal
                    </label>
                  </ActionForm>
                </div>
              </details>
            )}
          </section>
          <section>
            <SectionHeading title="Autorizados para recoger" />
            <Card className="divide-y divide-line">
              {s.pickups.length === 0 && <p className="px-4 py-3 text-sm text-ink-2">Nadie autorizado todavía.</p>}
              {s.pickups.map((p) => (
                <div key={p.id} className="flex items-start gap-3 px-4 py-3 text-sm">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                    <UserCheck className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-ink-2">
                      {p.relationship} · Cédula {p.idNumber}
                      {p.phone ? ` · ${p.phone}` : ""}
                    </p>
                  </div>
                  {manager && <RemoveButton kind="pickup" studentId={s.id} id={p.id} label={p.name} />}
                </div>
              ))}
            </Card>
            {manager && (
              <details className="group mt-3 rounded-xl bg-surface shadow-card">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-brand">
                  <UserPlus className="size-4" aria-hidden /> Autorizar a otra persona
                </summary>
                <div className="border-t border-line p-4">
                  <ActionForm action={addPickup} submitLabel="Autorizar">
                    <input type="hidden" name="studentId" value={s.id} />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Nombre completo" htmlFor="p-name"><input id="p-name" name="name" required className={inputClass} /></Field>
                      <Field label="Cédula" htmlFor="p-id"><input id="p-id" name="idNumber" required className={inputClass} /></Field>
                      <Field label="Parentesco" htmlFor="p-rel"><input id="p-rel" name="relationship" required className={inputClass} /></Field>
                      <Field label="Teléfono" htmlFor="p-phone"><input id="p-phone" name="phone" inputMode="tel" className={inputClass} /></Field>
                    </div>
                  </ActionForm>
                </div>
              </details>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <SectionHeading title="Asistencia reciente" />
            <Card className="p-4">
              <AttendanceStrip records={[...s.attendance].reverse()} />
              <p className="mt-3 text-xs text-ink-2">
                Últimos {s.attendance.length} días con registro. Verde: presente · amarillo: tardía · rojo: ausente · gris: justificada.
              </p>
            </Card>
          </section>
          {statement && (
            <section>
              <SectionHeading
                title="Estado de cuenta"
                action={<span className={`tabular text-sm font-semibold ${statement.overdue > 0 ? "text-danger" : "text-ink-2"}`}>{statement.charged - statement.paid > 0 ? `Saldo ${crc(statement.charged - statement.paid)}${statement.usd.charged - statement.usd.paid > 0 ? ` + ${usd(statement.usd.charged - statement.usd.paid)}` : ""}` : "Al día"}</span>}
              />
              <Card className="divide-y divide-line">
                {statement.charges
                  .filter((c) => c.status !== "paid")
                  .map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <div>
                        <p className="font-medium">{c.description}</p>
                        <p className="text-ink-2">Vence {dateLabel(c.date)}</p>
                      </div>
                      <Badge tone={c.status === "overdue" ? "danger" : "warn"}>{money(c.amount - (c.paidAmount ?? 0), c.currency)}</Badge>
                    </div>
                  ))}
                {[...statement.payments]
                  .reverse()
                  .slice(0, 4)
                  .map((p) => (
                    <Link key={p.id} href={`/recibos/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-canvas">
                      <div>
                        <p className="font-medium">{p.description}</p>
                        <p className="text-ink-2">
                          {dateLabel(p.date)} · {METHOD_LABEL[p.method!]}
                        </p>
                      </div>
                      <span className="tabular font-medium text-ok">{money(p.amount, p.currency)}</span>
                    </Link>
                  ))}
              </Card>
            </section>
          )}
          {manager && s.status === "ACTIVE" && (
            <details className="rounded-xl bg-surface shadow-card">
              <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-ink-2 hover:text-ink">
                <DoorOpen className="size-4" aria-hidden /> Registrar retiro o traslado
              </summary>
              <div className="border-t border-line p-4">
                <ActionForm action={registerExit} submitLabel="Registrar salida del alumno" resetOnOk={false}>
                  <input type="hidden" name="studentId" value={s.id} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Tipo" htmlFor="x-status">
                      <select id="x-status" name="status" required defaultValue="" className={inputClass}>
                        <option value="" disabled>Elegir…</option>
                        <option value="TRANSFERRED">Traslado a otra escuela</option>
                        <option value="WITHDRAWN">Retiro</option>
                      </select>
                    </Field>
                    <Field label="Fecha" htmlFor="x-date">
                      <input id="x-date" name="exitDate" type="date" required defaultValue={todayKey()} className={inputClass} />
                    </Field>
                    <Field label="Motivo" htmlFor="x-reason">
                      <select id="x-reason" name="exitReason" required defaultValue="" className={inputClass}>
                        <option value="" disabled>Elegir…</option>
                        {EXIT_REASONS.map((r) => (
                          <option key={r}>{r}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Detalle (opcional)" htmlFor="x-detail" hint="Ej.: escuela a la que se traslada.">
                      <input id="x-detail" name="exitDetail" className={inputClass} />
                    </Field>
                  </div>
                  <p className="text-xs text-ink-3">El alumno deja de aparecer en asistencia, notas y cobros. El expediente y sus pagos se conservan, y se puede reactivar.</p>
                </ActionForm>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
