import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Printer, Receipt } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents, METHOD_LABEL, statementFor } from "@/lib/queries";
import { crc, dateLabel, money, relativeDay, usd } from "@/lib/format";
import { BankInfo } from "@/components/bank-info";
import { Avatar, Badge, ButtonLink, Card, SectionHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Estado de cuenta" };

const STATUS = {
  paid: { label: "Pagado", tone: "ok" },
  partial: { label: "Abono parcial", tone: "warn" },
  due: { label: "Por pagar", tone: "warn" },
  overdue: { label: "Vencido", tone: "danger" },
} as const;

const REPORT = {
  PENDING: { label: "En revisión", tone: "warn" },
  APPROVED: { label: "Aplicado", tone: "ok" },
  REJECTED: { label: "Rechazado", tone: "danger" },
} as const;

export default async function FamilyAccount({ searchParams }: { searchParams: Promise<{ reportado?: string }> }) {
  const { reportado } = await searchParams;
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const ids = students.map((s) => s.id);
  const [statements, school, reports] = await Promise.all([
    statementFor(ids),
    prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } }),
    prisma.paymentReport.findMany({
      where: { studentId: { in: ids } },
      select: { id: true, concept: true, amount: true, currency: true, status: true, reviewNote: true, createdAt: true, student: { select: { firstName: true } } },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);
  const total = [...statements.values()].reduce((s, b) => s + b.charged - b.paid, 0);
  const overdue = [...statements.values()].reduce((s, b) => s + b.overdue, 0);
  const totalUsd = [...statements.values()].reduce((s, b) => s + b.usd.charged - b.usd.paid, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Estado de cuenta</h1>
        <p className="mt-1 text-sm text-ink-2">Mensualidades, matrícula y pagos de su familia.</p>
      </div>
      {reportado && (
        <p role="status" className="ack-in flex items-center gap-2 rounded-xl bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="size-4" aria-hidden /> Recibimos su comprobante. Secretaría lo revisará pronto.
        </p>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start lg:gap-10">
        <div className="min-w-0 space-y-8 lg:sticky lg:top-24">
      <Card className="overflow-hidden">
        <div className="bg-brand px-5 py-5 text-white">
          <p className="text-sm text-white/80">{total > 0 ? "Saldo pendiente de la familia" : "Saldo de la familia"}</p>
          <p className="tabular mt-1 text-3xl font-semibold">{crc(Math.max(total, 0))}</p>
          {totalUsd > 0 && <p className="tabular mt-0.5 text-lg font-semibold text-white/90">+ {usd(totalUsd)}</p>}
          {overdue > 0 ? (
            <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">Incluye {crc(overdue)} vencidos</p>
          ) : total > 0 ? (
            <p className="mt-2 text-sm text-white/80">Al día: no tiene montos vencidos.</p>
          ) : (
            <p className="mt-2 text-sm text-white/80">Está al día. ¡Gracias!</p>
          )}
        </div>
        <div className="space-y-4 p-5">
          <ButtonLink href="/familia/cuenta/reportar" size="lg" className="w-full">
            <Receipt className="size-5" aria-hidden /> Reportar un pago
          </ButtonLink>
          <Link href="/familia/cuenta/imprimir" className="tap flex items-center gap-2 text-sm font-medium text-brand hover:underline">
            <Printer className="size-4" aria-hidden /> Imprimir o descargar el estado de cuenta
          </Link>
          <details className="group">
            <summary className="tap flex cursor-pointer list-none items-center justify-between text-sm font-medium text-brand">
              Cuenta para depósitos y transferencias
              <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <BankInfo bank={school} className="mt-3" />
          </details>
        </div>
      </Card>

      {reports.length > 0 && (
        <section>
          <SectionHeading title="Pagos reportados" />
          <Card className="divide-y divide-line">
            {reports.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {r.concept} · {r.student.firstName}
                  </p>
                  <p className="text-sm text-ink-2">
                    Enviado {relativeDay(r.createdAt).toLowerCase()}
                    {r.status === "REJECTED" && r.reviewNote ? ` · ${r.reviewNote}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="tabular font-semibold">{money(r.amount, r.currency)}</p>
                  <Badge tone={REPORT[r.status].tone}>{REPORT[r.status].label}</Badge>
                </div>
              </div>
            ))}
          </Card>
        </section>
      )}

        </div>
        <div className="min-w-0 space-y-8">
      {students.map((s) => {
        const st = statements.get(s.id)!;
        const open = st.charges.filter((c) => c.status !== "paid");
        const paid = st.charges.filter((c) => c.status === "paid").reverse();
        return (
          <section key={s.id}>
            <SectionHeading
              title={`${s.firstName} ${s.lastName.split(" ")[0]}`}
              action={<span className="tabular text-sm font-medium text-ink-2">{st.charged - st.paid > 0 ? `Debe ${crc(st.charged - st.paid)}${st.usd.charged - st.usd.paid > 0 ? ` + ${usd(st.usd.charged - st.usd.paid)}` : ""}` : st.usd.charged - st.usd.paid > 0 ? `Debe ${usd(st.usd.charged - st.usd.paid)}` : "Al día"}</span>}
            />
            <Card className="divide-y divide-line">
              <div className="flex items-center gap-3 px-4 py-3">
                <Avatar name={`${s.firstName} ${s.lastName}`} color={s.section.color} size={32} />
                <p className="text-sm text-ink-2">
                  {s.section.grade.name} {s.section.name} · Cédula {s.idNumber}
                </p>
              </div>
              {open.map((c) => (
                <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{c.description}</p>
                    <p className="text-sm text-ink-2">Vence {dateLabel(c.date, { day: "numeric", month: "long" })}</p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-semibold">{money(c.amount - (c.paidAmount ?? 0), c.currency)}</p>
                    <Badge tone={STATUS[c.status!].tone}>{STATUS[c.status!].label}</Badge>
                  </div>
                </div>
              ))}
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-brand hover:bg-canvas">
                  Historial de pagos ({st.payments.length})
                  <ChevronDown className="size-4 text-ink-3 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <ul className="divide-y divide-line border-t border-line">
                  {[...st.payments].reverse().map((p) => (
                    <li key={p.id}>
                      <Link href={`/recibos/${p.id}`} className="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-canvas">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{p.description}</p>
                        <p className="text-ink-2">
                          {dateLabel(p.date, { day: "numeric", month: "short", year: "numeric" })} · {METHOD_LABEL[p.method!]}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                      </div>
                      <p className="tabular font-medium text-ok">{money(p.amount, p.currency)}</p>
                      <Receipt className="size-4 shrink-0 text-ink-3" aria-label="Ver recibo" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
              {paid.length > 0 && open.length === 0 && (
                <p className="px-4 py-3 text-sm text-ink-2">Todos los cargos de {s.firstName} están pagados.</p>
              )}
            </Card>
          </section>
        );
      })}
        </div>
      </div>
    </div>
  );
}
