import type { Metadata } from "next";
import { ChevronDown, Landmark, Smartphone } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { guardianStudents, METHOD_LABEL, statementFor } from "@/lib/queries";
import { crc, dateLabel } from "@/lib/format";
import { Avatar, Badge, Card, SectionHeading } from "@/components/ui";

export const metadata: Metadata = { title: "Estado de cuenta" };

const STATUS = {
  paid: { label: "Pagado", tone: "ok" },
  partial: { label: "Abono parcial", tone: "warn" },
  due: { label: "Por pagar", tone: "warn" },
  overdue: { label: "Vencido", tone: "danger" },
} as const;

export default async function FamilyAccount() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const statements = await statementFor(students.map((s) => s.id));
  const total = [...statements.values()].reduce((s, b) => s + b.charged - b.paid, 0);
  const overdue = [...statements.values()].reduce((s, b) => s + b.overdue, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Estado de cuenta</h1>
        <p className="mt-1 text-sm text-ink-2">Mensualidades, matrícula y pagos de su familia.</p>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-brand px-5 py-5 text-white">
          <p className="text-sm text-white/80">{total > 0 ? "Saldo pendiente de la familia" : "Saldo de la familia"}</p>
          <p className="tabular mt-1 text-3xl font-semibold">{crc(Math.max(total, 0))}</p>
          {overdue > 0 ? (
            <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">Incluye {crc(overdue)} vencidos</p>
          ) : total > 0 ? (
            <p className="mt-2 text-sm text-white/80">Al día: no tiene montos vencidos.</p>
          ) : (
            <p className="mt-2 text-sm text-white/80">Está al día. ¡Gracias!</p>
          )}
        </div>
        {total > 0 && (
          <div className="space-y-3 p-5">
            <p className="text-sm font-medium">Cómo pagar</p>
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Landmark className="size-[18px]" aria-hidden /></span>
              <p className="text-sm text-ink-2">
                <span className="font-medium text-ink">Banco Popular:</span> en Popular en Línea o en ventanilla, con la referencia que le indique la escuela. El pago se refleja aquí cuando el banco lo reporta.
              </p>
            </div>
            <div className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"><Smartphone className="size-[18px]" aria-hidden /></span>
              <p className="text-sm text-ink-2">
                <span className="font-medium text-ink">SINPE Móvil o transferencia:</span> envíe el comprobante a Secretaría para que lo registre.
              </p>
            </div>
          </div>
        )}
      </Card>

      {students.map((s) => {
        const st = statements.get(s.id)!;
        const open = st.charges.filter((c) => c.status !== "paid");
        const paid = st.charges.filter((c) => c.status === "paid").reverse();
        return (
          <section key={s.id}>
            <SectionHeading
              title={`${s.firstName} ${s.lastName.split(" ")[0]}`}
              action={<span className="tabular text-sm font-medium text-ink-2">{st.charged - st.paid > 0 ? `Debe ${crc(st.charged - st.paid)}` : "Al día"}</span>}
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
                    <p className="tabular font-semibold">{crc(c.amount - (c.paidAmount ?? 0))}</p>
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
                    <li key={p.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{p.description}</p>
                        <p className="text-ink-2">
                          {dateLabel(p.date, { day: "numeric", month: "short", year: "numeric" })} · {METHOD_LABEL[p.method!]}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                      </div>
                      <p className="tabular font-medium text-ok">{crc(p.amount)}</p>
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
  );
}
