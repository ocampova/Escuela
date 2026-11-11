import Link from "next/link";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { METHOD_LABEL } from "@/lib/queries";
import { dateLabel, gradeSectionName, money } from "@/lib/format";
import { PrintButton } from "@/components/print-button";
import { PrintSheet } from "@/components/print-sheet";
import { buttonClass } from "@/components/ui";

export const metadata: Metadata = { title: "Recibo de pago" };

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/recibos/${id}`);
  const p = await prisma.payment.findFirst({
    where: {
      id,
      student: { section: { schoolYear: { schoolId: user.schoolId } }, ...(user.role === "GUARDIAN" ? { guardians: { some: { userId: user.id } } } : {}) },
    },
    include: { student: { include: { section: { include: { grade: true } }, guardians: { where: { isPrimary: true }, include: { user: { select: { name: true } } } } } }, loggedBy: { select: { name: true } } },
  });
  if (!p || (user.role !== "GUARDIAN" && !isManager(user) && user.role !== "TEACHER")) notFound();
  if (user.role === "TEACHER") notFound();
  const back = user.role === "GUARDIAN" ? "/familia/cuenta" : `/escuela/alumnos/${p.studentId}`;
  const rows: [string, string][] = [
    ["Estudiante", `${p.student.firstName} ${p.student.lastName}`],
    ["Sección", gradeSectionName(p.student.section)],
    ...(p.student.idNumber ? ([["Cédula", p.student.idNumber]] as [string, string][]) : []),
    ...(p.student.guardians[0] ? ([["Encargado", p.student.guardians[0].user.name]] as [string, string][]) : []),
    ["Concepto", p.note ?? "Pago"],
    ["Fecha del pago", dateLabel(p.paidAt, { day: "numeric", month: "long", year: "numeric" })],
    ["Forma de pago", METHOD_LABEL[p.method]],
    ...(p.reference ? ([["Referencia", p.reference]] as [string, string][]) : []),
  ];
  return (
    <PrintSheet
      school={user.school}
      title={`Recibo de pago n.º ${p.receiptNumber}`}
      subtitle={`Emitido el ${dateLabel(new Date(p.createdAt.toISOString().slice(0, 10)), { day: "numeric", month: "long", year: "numeric" })}`}
      actions={
        <>
          <Link href={back} className={buttonClass("ghost")}>
            <ArrowLeft className="size-4" aria-hidden /> Volver
          </Link>
          <PrintButton />
        </>
      }
    >
      <dl className="divide-y divide-line rounded-lg ring-1 ring-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
            <dt className="text-ink-2">{k}</dt>
            <dd className="min-w-0 text-right font-medium break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 flex items-baseline justify-between rounded-lg bg-brand-soft px-4 py-4 print:bg-white print:ring-1 print:ring-line">
        <span className="font-medium text-brand-ink">Monto recibido</span>
        <span className="tabular text-2xl font-semibold text-brand-ink">{money(p.amount, p.currency)}</span>
      </div>
      <p className="mt-6 text-xs text-ink-3">
        Comprobante de pago generado por la plataforma de San Cayetano School{p.loggedBy ? ` y registrado por ${p.loggedBy.name}` : ""}. No sustituye una factura electrónica.
      </p>
    </PrintSheet>
  );
}
