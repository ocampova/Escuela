import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, FileText } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections, statementFor } from "@/lib/queries";
import { crc, dateLabel, gradeSectionName, money, relativeDay, todayKey, usd } from "@/lib/format";
import { METHOD_LABEL } from "@/lib/queries";
import { ActionForm } from "@/components/action-form";
import { Avatar, Badge, Card, Field, PageHeader, SectionHeading, cx, inputClass } from "@/components/ui";
import { approveReport, chargeConcept, rejectReport } from "../actions";
import { MonthlyChargesForm, PaymentForm } from "./payment-forms";

export const metadata: Metadata = { title: "Cobros" };

export default async function ChargesPage({ searchParams }: { searchParams: Promise<{ alumno?: string; filtro?: string; revisado?: string }> }) {
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela");
  const { alumno, filtro, revisado } = await searchParams;
  const sections = await staffSections(user);
  const students = await prisma.student.findMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
    include: { section: { include: { grade: true } }, guardians: { where: { isPrimary: true }, include: { user: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const [st, reports, concepts] = await Promise.all([
    statementFor(students.map((s) => s.id)),
    prisma.paymentReport.findMany({
      where: { status: "PENDING", studentId: { in: students.map((s) => s.id) } },
      include: { student: { include: { section: { include: { grade: true } } } }, reportedBy: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.feeConcept.findMany({ where: { schoolId: user.schoolId, recurring: false }, include: { level: true }, orderBy: [{ name: "asc" }] }),
  ]);
  const rows = students.map((s) => {
    const x = st.get(s.id)!;
    return { s, balance: x.charged - x.paid, overdue: x.overdue, charged: x.charged, paid: x.paid, usdBalance: x.usd.charged - x.usd.paid };
  });
  const overdueRows = rows.filter((r) => r.overdue > 0);
  const pendingRows = rows.filter((r) => r.balance > 0);
  const shown = filtro === "vencidos" ? overdueRows : filtro === "pendientes" ? pendingRows : rows;
  const totalOverdue = overdueRows.reduce((a, r) => a + r.overdue, 0);
  const totalPending = pendingRows.reduce((a, r) => a + r.balance, 0);
  const today = todayKey();

  const tabs = [
    { key: undefined, label: "Todos", n: rows.length },
    { key: "pendientes", label: "Con saldo", n: pendingRows.length },
    { key: "vencidos", label: "Vencidos", n: overdueRows.length },
  ];

  return (
    <div>
      <PageHeader
        title="Cobros"
        description={
          <>
            Saldo por cobrar <span className="tabular font-medium text-ink">{crc(totalPending)}</span>, de los cuales{" "}
            <span className="tabular font-medium text-danger">{crc(totalOverdue)}</span> están vencidos.
          </>
        }
      />
      {revisado && (
        <p role="status" className="ack-in mb-6 flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-4" aria-hidden />
          {revisado === "aprobado" ? "Pago aprobado y aplicado al estado de cuenta de la familia." : "Reporte rechazado. La familia verá el motivo."}
        </p>
      )}
      {reports.length > 0 && (
        <section className="mb-8">
          <SectionHeading title={`Pagos reportados por revisar (${reports.length})`} />
          <Card className="divide-y divide-line">
            {reports.map((r) => (
              <div key={r.id} className="grid gap-4 px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="flex min-w-0 gap-3">
                  <Avatar name={`${r.student.firstName} ${r.student.lastName}`} color={r.student.section.color} size={36} />
                  <div className="min-w-0 text-sm">
                    <p className="font-medium">
                      {r.student.firstName} {r.student.lastName} · <span className="tabular">{money(r.amount, r.currency)}</span>
                    </p>
                    <p className="text-ink-2">
                      {r.concept} · {METHOD_LABEL[r.method]} del {dateLabel(r.paidAt, { day: "numeric", month: "short" })}
                      {r.reference ? ` · Ref. ${r.reference}` : ""}
                    </p>
                    <p className="text-ink-3">
                      Reportado por {r.reportedBy.name} · {relativeDay(r.createdAt).toLowerCase()}
                      {r.note ? ` · «${r.note}»` : ""}
                    </p>
                    <a href={`/escuela/cobros/comprobante/${r.id}`} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1.5 font-medium text-brand hover:underline">
                      <FileText className="size-4" aria-hidden /> Ver comprobante
                    </a>
                  </div>
                </div>
                <div className="flex flex-col gap-2 md:w-[300px]">
                  <ActionForm action={approveReport} submitLabel="Aprobar y aplicar" inline resetOnOk={false}>
                    <input type="hidden" name="id" value={r.id} />
                    <label className="min-w-0 flex-1">
                      <span className="sr-only">Monto recibido</span>
                      <input name="amount" defaultValue={r.amount} inputMode="numeric" className={cx(inputClass, "tabular h-10 py-1.5")} />
                    </label>
                  </ActionForm>
                  <details>
                    <summary className="cursor-pointer text-sm text-ink-2 hover:text-danger">Rechazar…</summary>
                    <ActionForm action={rejectReport} submitLabel="Rechazar" variant="secondary" className="mt-2" resetOnOk={false}>
                      <input type="hidden" name="id" value={r.id} />
                      <input name="reviewNote" required placeholder="Motivo que verá la familia" className={inputClass} />
                    </ActionForm>
                  </details>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <nav aria-label="Filtro" className="mb-3 flex gap-1.5">
            {tabs.map((t) => (
              <Link
                key={t.label}
                href={t.key ? `/escuela/cobros?filtro=${t.key}` : "/escuela/cobros"}
                aria-current={filtro === t.key ? "page" : undefined}
                className={cx(
                  "inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium ring-1 ring-inset transition-colors",
                  filtro === t.key ? "bg-brand text-white ring-brand" : "bg-surface text-ink-2 ring-line-strong hover:bg-canvas",
                )}
              >
                {t.label}
                <span className={cx("tabular text-xs", filtro === t.key ? "text-white/75" : "text-ink-3")}>{t.n}</span>
              </Link>
            ))}
          </nav>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-canvas text-left text-xs text-ink-2">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Alumno</th>
                  <th className="px-4 py-2.5 text-right font-medium">Cobrado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Pagado</th>
                  <th className="px-4 py-2.5 text-right font-medium">Saldo</th>
                  <th className="px-4 py-2.5 font-medium"><span className="sr-only">Acción</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map(({ s, balance, overdue, charged, paid, usdBalance }) => (
                  <tr key={s.id} className={cx("transition-colors hover:bg-canvas", alumno === s.id && "bg-brand-soft/60")}>
                    <td className="px-4 py-3">
                      <Link href={`/escuela/alumnos/${s.id}`} className="flex items-center gap-3 hover:underline">
                        <Avatar name={`${s.firstName} ${s.lastName}`} color={s.section.color} size={30} />
                        <span>
                          <span className="block font-medium">
                            {s.firstName} {s.lastName}
                          </span>
                          <span className="block text-xs text-ink-3">
                            {gradeSectionName(s.section)} · {s.guardians[0]?.user.name}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-2">{crc(charged)}</td>
                    <td className="tabular whitespace-nowrap px-4 py-3 text-right text-ink-2">{crc(paid)}</td>
                    <td className="px-4 py-3 text-right">
                      {balance <= 0 ? (
                        <Badge tone="ok">Al día</Badge>
                      ) : (
                        <Badge tone={overdue > 0 ? "danger" : "warn"}>
                          <span className="tabular">{crc(balance)}</span>
                        </Badge>
                      )}
                      {usdBalance > 0 && <span className="tabular mt-1 block text-xs text-ink-2">+ {usd(usdBalance)}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {balance > 0 && (
                        <Link href={`/escuela/cobros?alumno=${s.id}${filtro ? `&filtro=${filtro}` : ""}`} className="whitespace-nowrap text-sm font-medium text-brand hover:underline">
                          Registrar pago
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-1 font-semibold">Registrar pago</h2>
            <p className="mb-4 text-sm text-ink-2">Para comprobantes de SINPE Móvil, transferencias o pagos en efectivo.</p>
            <PaymentForm
              selected={alumno}
              today={today}
              students={rows.map((r) => ({ id: r.s.id, label: `${r.s.firstName} ${r.s.lastName}`, due: Math.max(r.balance, 0) }))}
            />
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 font-semibold">Mensualidad del mes</h2>
            <p className="mb-4 text-sm text-ink-2">Crea el cargo de mensualidad para todos los alumnos. No duplica cargos ya creados.</p>
            <MonthlyChargesForm month={today.slice(0, 7)} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-1 font-semibold">Cargar un cobro</h2>
            <p className="mb-4 text-sm text-ink-2">Materiales, robótica u otro concepto, a todos los alumnos del nivel que corresponde.</p>
            <ActionForm action={chargeConcept} submitLabel="Cargar cobro">
              <Field label="Concepto" htmlFor="ch-concept">
                <select id="ch-concept" name="conceptId" className={inputClass}>
                  {concepts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.level ? `· ${c.level.name}` : "· todos"} · {money(c.defaultAmount, c.currency)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Descripción que verán las familias" htmlFor="ch-label">
                <input id="ch-label" name="label" placeholder={`Ej.: Materiales ${Number(today.slice(0, 4)) + 1}`} className={inputClass} />
              </Field>
              <Field label="Vence" htmlFor="ch-due">
                <input id="ch-due" name="dueDate" type="date" required defaultValue={`${today.slice(0, 4)}-12-15`} className={inputClass} />
              </Field>
            </ActionForm>
          </Card>
        </aside>
      </div>
    </div>
  );
}
