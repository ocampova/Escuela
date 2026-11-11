import type { Metadata } from "next";
import { CalendarCheck, Download, Receipt, Users, Wallet } from "lucide-react";
import { isManager, requireStaff } from "@/lib/auth";
import { staffSections } from "@/lib/queries";
import { gradeSectionName, todayKey } from "@/lib/format";
import { Card, PageHeader, buttonClass, inputClass } from "@/components/ui";

export const metadata: Metadata = { title: "Reportes" };

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Setiembre", "Octubre", "Noviembre", "Diciembre"];

function lastMonths(n: number) {
  const [y, m] = todayKey().split("-").map(Number);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    return { value: d.toISOString().slice(0, 7), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` };
  });
}

function Report({ icon, title, children, description }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return (
    <Card className="flex flex-col p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">{icon}</span>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-ink-2">{description}</p>
        </div>
      </div>
      <div className="mt-auto">{children}</div>
    </Card>
  );
}

const download = buttonClass("primary", "md", "w-full sm:w-auto");

export default async function ReportsPage() {
  const user = await requireStaff();
  const manager = isManager(user);
  const sections = await staffSections(user);
  const months = lastMonths(12);

  return (
    <div>
      <PageHeader title="Reportes" description="Descargue la información en Excel para el MEP, la contabilidad o el seguimiento de cobros." />
      <div className="grid gap-6 md:grid-cols-2">
        <Report icon={<CalendarCheck className="size-5" aria-hidden />} title="Asistencia mensual" description="Una columna por día lectivo (P, T, A, J) y totales con porcentaje, por sección. Una hoja por sección.">
          <form action="/escuela/reportes/asistencia" method="get" className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 flex-1 text-sm">
              <span className="mb-1.5 block font-medium">Sección</span>
              <select name="seccion" className={inputClass} defaultValue="">
                {sections.length > 1 && <option value="">Todas</option>}
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {gradeSectionName(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 flex-1 text-sm">
              <span className="mb-1.5 block font-medium">Mes</span>
              <select name="mes" className={inputClass}>
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <button className={download}>
              <Download className="size-4" aria-hidden /> Descargar
            </button>
          </form>
        </Report>

        {manager && (
          <>
            <Report icon={<Users className="size-5" aria-hidden />} title="Lista de alumnos" description="Con cédula, nacimiento, salud, autorización de fotos, encargados y autorizados para recoger.">
              <a href="/escuela/reportes/alumnos" className={download}>
                <Download className="size-4" aria-hidden /> Descargar
              </a>
            </Report>
            <Report icon={<Wallet className="size-5" aria-hidden />} title="Saldos y morosidad" description="Saldo, monto vencido y último pago de cada alumno, con el contacto del encargado.">
              <div className="flex flex-wrap gap-2">
                <a href="/escuela/reportes/morosidad?solo=vencidos" className={download}>
                  <Download className="size-4" aria-hidden /> Solo vencidos
                </a>
                <a href="/escuela/reportes/morosidad" className={buttonClass("secondary", "md", "w-full sm:w-auto")}>
                  Todos los saldos
                </a>
              </div>
            </Report>
            <Report icon={<Receipt className="size-5" aria-hidden />} title="Pagos del mes" description="Cada pago recibido con número de recibo, medio y referencia, para la contabilidad y la conciliación con el banco.">
              <form action="/escuela/reportes/pagos" method="get" className="flex flex-wrap items-end gap-3">
                <label className="min-w-0 flex-1 text-sm">
                  <span className="mb-1.5 block font-medium">Mes</span>
                  <select name="mes" className={inputClass}>
                    {months.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={download}>
                  <Download className="size-4" aria-hidden /> Descargar
                </button>
              </form>
            </Report>
          </>
        )}
      </div>
      <p className="mt-6 text-xs text-ink-3">Los archivos incluyen datos personales de estudiantes y familias. Guárdelos en un lugar seguro y compártalos solo con quien los necesite.</p>
    </div>
  );
}
