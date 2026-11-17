import Link from "next/link";
import type { ReactNode } from "react";
import { CheckCircle2, ChevronRight, ClipboardCheck, FileCheck2, Inbox, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth";
import { announcementRecipients } from "@/lib/queries";
import { crc, dateTimeLabel, gradeSectionName, keyToDate, todayKey } from "@/lib/format";
import { Card, SectionHeading, cx } from "@/components/ui";
import { Item } from "./mi-dia";
import { RemindButton } from "./remind-button";

const DAY = 86_400_000;
type Section = { id: string; name: string; color: string; grade: { name: string }; teacher: { name: string } | null; _count: { students: number } };

/** Hora actual en Costa Rica (0–23). */
const crHour = () => Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Costa_Rica", hour: "numeric", hour12: false }).format(new Date()));

function Row({ label, value, detail, href, tone }: { label: string; value: ReactNode; detail?: ReactNode; href: string; tone?: "ok" | "warn" | "danger" }) {
  return (
    <Link href={href} className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-canvas">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-2">{label}</p>
        <p className={cx("mt-0.5 font-semibold", tone === "danger" ? "text-danger" : tone === "warn" ? "text-warn" : tone === "ok" ? "text-ok" : "text-ink")}>{value}</p>
        {detail && <p className="mt-0.5 text-sm text-ink-2">{detail}</p>}
      </div>
      <ChevronRight className="size-5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </Link>
  );
}

/**
 * Panel de Dirección: primero lo que requiere su intervención (solo excepciones),
 * luego el estado de la escuela en cuatro líneas. El detalle operativo (quién pasó
 * lista) solo aparece como alerta cuando ya es tarde.
 */
export async function DirectorToday({ user, sections, schoolDay }: { user: CurrentUser; sections: Section[]; schoolDay: boolean }) {
  const today = keyToDate(todayKey());
  const now = Date.now();
  const nextYear = String(new Date(now - 6 * 3600_000).getUTCFullYear() + 1);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const ids = sections.map((s) => s.id);

  const [convs, applicants, oldReports, attendance, notices, reminded, paymentsMonth, chargesMonth, acks] = await Promise.all([
    // Conversaciones cuyo último mensaje es de la familia: esperan respuesta
    prisma.conversation.findMany({
      where: { schoolId: user.schoolId },
      select: { id: true, lastMessageAt: true, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { sender: { select: { role: true } } } } },
    }),
    prisma.applicant.groupBy({ by: ["status"], where: { schoolId: user.schoolId, forYear: nextYear }, _count: true }),
    prisma.paymentReport.count({ where: { status: "PENDING", createdAt: { lt: new Date(now - 2 * DAY) }, student: { section: { schoolYear: { schoolId: user.schoolId } } } } }),
    prisma.attendance.findMany({ where: { date: today, student: { sectionId: { in: ids }, status: "ACTIVE" } }, select: { status: true, student: { select: { sectionId: true } } } }),
    prisma.absenceNotice.count({ where: { dateFrom: { lte: today }, dateTo: { gte: today }, student: { sectionId: { in: ids }, status: "ACTIVE" } } }),
    prisma.reminderLog.findMany({ where: { day: today, kind: { startsWith: "lista-" } }, select: { kind: true } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { currency: "CRC", paidAt: { gte: monthStart }, student: { section: { schoolYear: { schoolId: user.schoolId } } } } }),
    prisma.charge.aggregate({ _sum: { amount: true }, where: { currency: "CRC", dueDate: { gte: monthStart, lt: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1)) }, student: { status: "ACTIVE", section: { schoolYear: { schoolId: user.schoolId } } } } }),
    prisma.announcement.findMany({
      where: { schoolId: user.schoolId, requiresAck: true, createdAt: { gte: new Date(now - 30 * DAY) } },
      include: { reads: { where: { acknowledgedAt: { not: null } }, select: { userId: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  // Familias esperando respuesta
  const waiting = convs.filter((c) => c.messages[0]?.sender.role === "GUARDIAN");
  const waitingLong = waiting.filter((c) => now - c.lastMessageAt.getTime() > DAY);

  // Matrícula del próximo año
  const count = (s: string) => applicants.find((a) => a.status === s)?._count ?? 0;
  const newApps = count("NEW");
  const inProcess = count("CONTACTED") + count("VISIT") + count("ACCEPTED");
  const enrolled = count("ENROLLED");

  // Asistencia: alerta solo si ya pasaron las 9:00 y una sección sigue sin lista
  const late = schoolDay && crHour() >= 9;
  const missing = schoolDay ? sections.filter((s) => s._count.students > 0 && !attendance.some((a) => a.student.sectionId === s.id)) : [];
  const remindedSet = new Set(reminded.map((r) => r.kind.slice("lista-".length)));
  const present = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const absent = attendance.filter((a) => a.status === "ABSENT" || a.status === "EXCUSED").length;

  // Cobro del mes
  const paid = paymentsMonth._sum.amount ?? 0;
  const billed = chargesMonth._sum.amount ?? 0;

  // Lectura de avisos (promedio de los últimos con «Enterado»)
  const ackStats = await Promise.all(acks.map(async (a) => ({ total: (await announcementRecipients(a)).length, done: a.reads.length })));
  const ackTotal = ackStats.reduce((s, x) => s + x.total, 0);
  const ackPct = ackTotal ? Math.round((ackStats.reduce((s, x) => s + x.done, 0) / ackTotal) * 100) : null;

  const attention = [
    waitingLong.length > 0 && (
      <Item
        key="msgs"
        icon={<MessageCircle className="size-5" aria-hidden />}
        title={`${waitingLong.length} ${waitingLong.length === 1 ? "familia espera" : "familias esperan"} respuesta hace más de un día`}
        detail="Mensajes a docentes u oficina sin contestar."
        href="/escuela/mensajes?filtro=esperando"
      />
    ),
    newApps > 0 && (
      <Item
        key="apps"
        icon={<Inbox className="size-5" aria-hidden />}
        title={`${newApps} ${newApps === 1 ? "solicitud de matrícula" : "solicitudes de matrícula"} sin contactar`}
        detail={`Para el curso ${nextYear}. Cada día sin respuesta es una familia que puede elegir otra escuela.`}
        href="/escuela/matricula"
      />
    ),
    oldReports > 0 && (
      <Item
        key="reports"
        icon={<FileCheck2 className="size-5" aria-hidden />}
        title={`${oldReports} ${oldReports === 1 ? "comprobante de pago lleva" : "comprobantes de pago llevan"} más de 2 días sin revisar`}
        detail="La familia ya pagó y todavía no ve el pago aplicado."
        href="/escuela/cobros"
      />
    ),
    late && missing.length > 0 && (
      <Item
        key="lists"
        icon={<ClipboardCheck className="size-5" aria-hidden />}
        title={`${missing.length === 1 ? "Una sección no ha" : `${missing.length} secciones no han`} pasado lista`}
        detail={
          <ul className="mt-1 space-y-1.5">
            {missing.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span>
                  {gradeSectionName(s)}
                  {s.teacher ? ` · ${s.teacher.name.split(" ").slice(0, 2).join(" ")}` : ""}
                </span>
                {s.teacher && <RemindButton sectionId={s.id} teacher={s.teacher.name.split(" ")[0]} sent={remindedSet.has(s.id)} />}
              </li>
            ))}
          </ul>
        }
      />
    ),
  ].filter(Boolean);

  return (
    <>
      <section>
        <SectionHeading title="Requiere su atención" />
        <Card>
          {attention.length > 0 ? (
            <ul className="divide-y divide-line">{attention}</ul>
          ) : (
            <p className="flex items-center gap-3 px-4 py-4 text-sm text-ink-2">
              <CheckCircle2 className="size-5 shrink-0 text-ok" aria-hidden />
              <span>
                <span className="font-medium text-ink">Todo en orden.</span> No hay familias esperando, solicitudes sin contactar ni pagos atrasados en revisión.
              </span>
            </p>
          )}
        </Card>
      </section>

      <section>
        <SectionHeading title="La escuela hoy" />
        <Card className="divide-y divide-line">
          <Row
            label={`Matrícula ${nextYear}`}
            value={`${enrolled} ${enrolled === 1 ? "matriculado" : "matriculados"}`}
            detail={`${inProcess} en proceso · ${newApps} ${newApps === 1 ? "solicitud nueva" : "solicitudes nuevas"}`}
            href="/escuela/matricula"
          />
          <Row
            label={`Cobro de ${dateTimeLabel(new Date(), { month: "long" })}`}
            value={billed ? `${crc(paid)} de ${crc(billed)} (${Math.round((paid / billed) * 100)} %)` : crc(paid)}
            tone={billed && paid / billed < 0.7 ? "warn" : undefined}
            detail="Recibido este mes frente a lo que vence en el mes."
            href="/escuela/cobros"
          />
          <Row
            label="Asistencia de hoy"
            value={!schoolDay ? "Sin lecciones" : attendance.length ? `${present} presentes · ${absent} ${absent === 1 ? "ausente" : "ausentes"}` : "Todavía sin listas"}
            detail={schoolDay ? `${sections.length - missing.length} de ${sections.length} secciones con lista${notices ? ` · ${notices} ${notices === 1 ? "ausencia avisada" : "ausencias avisadas"} por la familia` : ""}` : undefined}
            href="/escuela/asistencia"
          />
          {ackPct !== null && (
            <Row
              label="Lectura de avisos (último mes)"
              value={`${ackPct} % de las familias confirma`}
              tone={ackPct < 60 ? "warn" : "ok"}
              detail={`Promedio de los avisos que piden «Enterado» en los últimos 30 días.`}
              href="/escuela/avisos"
            />
          )}
        </Card>
      </section>
    </>
  );
}

