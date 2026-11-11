import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileUp } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections, statementFor } from "@/lib/queries";
import { crc, gradeSectionName, todayKey } from "@/lib/format";
import { Avatar, Badge, Card, PageHeader, cx } from "@/components/ui";
import { MonthlyChargesForm, PaymentForm } from "./payment-forms";

export const metadata: Metadata = { title: "Cobros" };

export default async function ChargesPage({ searchParams }: { searchParams: Promise<{ alumno?: string; filtro?: string }> }) {
  const user = await requireStaff();
  if (!isManager(user)) redirect("/escuela");
  const { alumno, filtro } = await searchParams;
  const sections = await staffSections(user);
  const students = await prisma.student.findMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
    include: { section: { include: { grade: true } }, guardians: { where: { isPrimary: true }, include: { user: true } } },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });
  const st = await statementFor(students.map((s) => s.id));
  const rows = students.map((s) => {
    const x = st.get(s.id)!;
    return { s, balance: x.charged - x.paid, overdue: x.overdue, charged: x.charged, paid: x.paid };
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
                {shown.map(({ s, balance, overdue, charged, paid }) => (
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
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-ink-3">
                <FileUp className="size-[18px]" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">Reporte del Banco Popular</h2>
                <p className="mt-1 text-sm text-ink-2">
                  Próximamente: suba el archivo de pagos del banco y la plataforma los aplica solos a cada alumno.
                </p>
                <Badge className="mt-3">Fase 5</Badge>
              </div>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
