import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { guardianStudents, statementFor } from "@/lib/queries";
import { crc, dateLabel, gradeSectionName, money, todayKey, keyToDate, usd } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { PrintSheet } from "@/components/print-sheet";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Estado de cuenta" };

export default async function PrintableStatement() {
  const user = await requireGuardian();
  const students = await guardianStudents(user.id);
  const st = await statementFor(students.map((s) => s.id));
  return (
    <div className="-mx-4 -mt-5 md:-mx-6 md:-mt-8 lg:-mx-8">
      <PrintSheet
        school={user.school}
        title="Estado de cuenta"
        subtitle={`${user.name} · al ${dateLabel(keyToDate(todayKey()), { day: "numeric", month: "long", year: "numeric" })}`}
        actions={
          <>
            <Link href="/familia/cuenta" className={buttonClass("ghost")}>
              <ArrowLeft className="size-4" aria-hidden /> Volver
            </Link>
            <PrintButton />
          </>
        }
      >
        <div className="space-y-8">
          {students.map((s) => {
            const x = st.get(s.id)!;
            const bal = x.charged - x.paid;
            const balUsd = x.usd.charged - x.usd.paid;
            return (
              <section key={s.id} className="break-inside-avoid">
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h2 className="font-semibold">
                    {s.firstName} {s.lastName} <span className="font-normal text-ink-2">· {gradeSectionName(s.section)}</span>
                  </h2>
                  <span className="tabular text-sm font-semibold">
                    {bal > 0 ? `Saldo ${crc(bal)}` : "Al día"}
                    {balUsd > 0 ? ` + ${usd(balUsd)}` : ""}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left text-xs text-ink-2">
                    <tr className="border-b border-line">
                      <th className="py-2 font-medium">Fecha</th>
                      <th className="py-2 font-medium">Detalle</th>
                      <th className="py-2 text-right font-medium">Cargo</th>
                      <th className="py-2 text-right font-medium">Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {[...x.charges.map((c) => ({ ...c, sort: c.date.getTime(), k: 0 })), ...x.payments.map((p) => ({ ...p, sort: p.date.getTime(), k: 1 }))]
                      .sort((a, b) => a.sort - b.sort || a.k - b.k)
                      .map((l) => (
                        <tr key={l.kind + l.id}>
                          <td className="tabular py-1.5 pr-3 whitespace-nowrap text-ink-2">{dateLabel(l.date, { day: "2-digit", month: "2-digit", year: "numeric" })}</td>
                          <td className="py-1.5 pr-3">{l.description}</td>
                          <td className="tabular py-1.5 text-right whitespace-nowrap">{l.kind === "charge" ? money(l.amount, l.currency) : ""}</td>
                          <td className="tabular py-1.5 text-right whitespace-nowrap text-ok">{l.kind === "payment" ? money(l.amount, l.currency) : ""}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      </PrintSheet>
    </div>
  );
}
