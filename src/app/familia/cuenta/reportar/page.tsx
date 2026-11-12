import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { guardianStudents, statementFor } from "@/lib/queries";
import { todayKey } from "@/lib/format";
import { BankInfo } from "@/components/bank-info";
import { Card } from "@/components/ui";
import { ReportForm } from "./report-form";

import { i18n } from "@/lib/i18n-server";
import { conceptLabel } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await i18n();
  return { title: t("Reportar pago") };
}

export default async function ReportPage() {
  const user = await requireGuardian();
  const { t, locale } = await i18n();
  const [students, school] = await Promise.all([guardianStudents(user.id), prisma.school.findUniqueOrThrow({ where: { id: user.schoolId } })]);
  const st = await statementFor(students.map((s) => s.id));
  const kids = students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    open: st
      .get(s.id)!
      .charges.filter((c) => c.status !== "paid")
      .map((c) => ({ description: c.description, label: conceptLabel(locale, c.description), pending: c.amount - (c.paidAmount ?? 0), currency: c.currency })),
  }));
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/familia/cuenta" className="-ml-2 inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium text-ink-2 hover:bg-surface hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden /> {t("Estado de cuenta")}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{t("Reportar un pago")}</h1>
        <p className="mt-1 text-sm text-ink-2">{t("Después de depositar o transferir, envíe aquí el comprobante. Secretaría lo revisa y se refleja en su estado de cuenta.")}</p>
      </div>
      <Card className="p-4">
        <p className="mb-3 text-sm font-medium">{t("Cuenta de la escuela")}</p>
        <BankInfo bank={school} locale={locale} />
      </Card>
      <Card className="p-5">
        <ReportForm kids={kids} today={todayKey()} locale={locale} />
      </Card>
    </div>
  );
}
