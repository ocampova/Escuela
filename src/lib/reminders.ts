import "server-only";
import { prisma } from "./db";
import { statementFor, type StatementLine } from "./queries";
import { notify } from "./push";
import { emailLayout, sendMany, type Mail } from "./mail";
import { appUrl } from "./tokens";
import { dateLabel, keyToDate, money, todayKey } from "./format";

/** Días de atraso en que se recuerda un cobro vencido (además de 3 días antes del vencimiento). */
export const OVERDUE_DAYS = [1, 8, 15, 30];
const DAY = 86_400_000;

type Item = { student: string; line: StatementLine; pending: number; days: number };

export type ReminderResult = { families: number; soon: number; overdue: number; emails: number; skipped: number };

/**
 * Recordatorios de cobro por familia (un solo mensaje con todo lo pendiente de sus hijos).
 * - Automático (cada día): 3 días antes del vencimiento y en los días 1, 8, 15 y 30 de atraso.
 * - Manual (`force`): a todas las familias con algo vencido o por vencer en los próximos 3 días.
 * No repite el mismo tipo de recordatorio a la misma familia el mismo día.
 */
export async function runPaymentReminders({ schoolId, force = false }: { schoolId?: string; force?: boolean } = {}): Promise<ReminderResult> {
  const result: ReminderResult = { families: 0, soon: 0, overdue: 0, emails: 0, skipped: 0 };
  const schools = await prisma.school.findMany({ where: { ...(schoolId ? { id: schoolId } : {}), ...(force ? {} : { remindersEnabled: true }) } });
  const today = keyToDate(todayKey());

  for (const school of schools) {
    const students = await prisma.student.findMany({
      where: { section: { schoolYear: { schoolId: school.id, active: true } } },
      include: { guardians: { include: { user: { select: { id: true, name: true, email: true, active: true, emailReceipts: true } } } } },
    });
    const st = await statementFor(students.map((s) => s.id));

    // Agrupar por encargado
    const byGuardian = new Map<string, { user: (typeof students)[number]["guardians"][number]["user"]; soon: Item[]; overdue: Item[] }>();
    for (const s of students) {
      for (const line of st.get(s.id)!.charges) {
        if (line.status === "paid") continue;
        const pending = line.amount - (line.paidAmount ?? 0);
        const diff = Math.round((line.date.getTime() - today.getTime()) / DAY);
        const isSoon = force ? diff >= 0 && diff <= 3 : diff === 3;
        const isOverdue = line.status === "overdue" && (force || OVERDUE_DAYS.includes(-diff));
        if (!isSoon && !isOverdue) continue;
        for (const g of s.guardians) {
          if (!g.user.active) continue;
          const entry = byGuardian.get(g.user.id) ?? { user: g.user, soon: [], overdue: [] };
          (isOverdue ? entry.overdue : entry.soon).push({ student: s.firstName, line, pending, days: Math.abs(diff) });
          byGuardian.set(g.user.id, entry);
        }
      }
    }

    const mails: Mail[] = [];
    for (const { user, soon, overdue } of byGuardian.values()) {
      const kind = overdue.length ? "pago-vencido" : "pago-por-vencer";
      try {
        await prisma.reminderLog.create({ data: { guardianId: user.id, kind, day: today, detail: [...overdue, ...soon].map((i) => `${i.student}: ${i.line.description}`).join("; ").slice(0, 500) } });
      } catch {
        result.skipped++; // ya se le recordó hoy
        continue;
      }
      result.families++;
      result.soon += soon.length;
      result.overdue += overdue.length;

      const totalCrc = [...overdue, ...soon].filter((i) => i.line.currency === "CRC").reduce((a, i) => a + i.pending, 0);
      const totalUsd = [...overdue, ...soon].filter((i) => i.line.currency === "USD").reduce((a, i) => a + i.pending, 0);
      const total = [totalCrc ? money(totalCrc, "CRC") : "", totalUsd ? money(totalUsd, "USD") : ""].filter(Boolean).join(" + ");
      const first = overdue[0] ?? soon[0];
      const title = overdue.length ? "Tiene pagos vencidos" : "Pago próximo a vencer";
      const body = overdue.length
        ? `${total} pendientes, entre ellos ${first.line.description} de ${first.student}. Si ya pagó, repórtelo en la plataforma.`
        : `${first.line.description} de ${first.student} (${money(first.pending, first.line.currency)}) vence el ${dateLabel(first.line.date, { weekday: "long", day: "numeric", month: "long" })}.`;

      await notify([user.id], { title, body, url: "/familia/cuenta", tag: `cobro-${todayKey()}` });

      if (user.emailReceipts) {
        const lines = [...overdue, ...soon].map(
          (i) => [`${i.line.description} · ${i.student}`, `${money(i.pending, i.line.currency)} · ${i.line.status === "overdue" ? `venció el ${dateLabel(i.line.date, { day: "numeric", month: "short" })}` : `vence el ${dateLabel(i.line.date, { day: "numeric", month: "short" })}`}`] as [string, string],
        );
        const { html, text } = emailLayout({
          preheader: body,
          title,
          paragraphs: [
            `Hola, ${user.name.split(" ")[0]}:`,
            overdue.length ? "Le recordamos que su estado de cuenta tiene montos pendientes:" : "Le recordamos el próximo vencimiento:",
          ],
          details: [...lines, ["Total pendiente", total]],
          cta: { label: "Ver estado de cuenta y reportar pago", url: appUrl("/familia/cuenta") },
          footnote: "Si ya realizó el pago, repórtelo en la plataforma con su comprobante y no tome en cuenta este mensaje. Puede desactivar estos correos en su perfil.",
        });
        mails.push({ to: user.email, subject: `${title} · ${school.name}`, text, html });
      }
    }
    result.emails += await sendMany(mails);
  }
  return result;
}
