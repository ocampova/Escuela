import { NextResponse } from "next/server";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections, statementFor } from "@/lib/queries";
import { gradeSectionName, todayKey } from "@/lib/format";
import { buildWorkbook, excelDate, xlsxResponse } from "@/lib/xlsx";

/** Saldos por alumno: vencido, por vencer y último pago. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isManager(user)) return new NextResponse("No autorizado", { status: 401 });
  const onlyOverdue = new URL(req.url).searchParams.get("solo") === "vencidos";
  const sections = await staffSections(user);
  const students = await prisma.student.findMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
    include: { section: { include: { grade: true } }, guardians: { where: { isPrimary: true }, include: { user: true } }, payments: { orderBy: { paidAt: "desc" }, take: 1 } },
    orderBy: [{ lastName: "asc" }],
  });
  const st = await statementFor(students.map((s) => s.id));
  const rows = students
    .map((s) => {
      const x = st.get(s.id)!;
      const g = s.guardians[0]?.user;
      return {
        name: `${s.lastName}, ${s.firstName}`,
        section: gradeSectionName(s.section),
        guardian: g?.name ?? "",
        phone: g?.phone ?? "",
        email: g?.email ?? "",
        balance: x.charged - x.paid,
        overdue: x.overdue,
        usd: x.usd.charged - x.usd.paid,
        lastPay: s.payments[0] ? excelDate(s.payments[0].paidAt) : null,
      };
    })
    .filter((r) => (onlyOverdue ? r.overdue > 0 : r.balance > 0 || r.usd > 0))
    .sort((a, b) => b.overdue - a.overdue || b.balance - a.balance);
  const sum = (k: "balance" | "overdue" | "usd") => rows.reduce((a, r) => a + r[k], 0);
  const buf = await buildWorkbook([
    {
      name: "Saldos",
      title: onlyOverdue ? `Morosidad: ${rows.length} alumnos con montos vencidos` : `Saldos pendientes: ${rows.length} alumnos`,
      subtitle: `${user.school.name} · al ${todayKey().split("-").reverse().join("/")}`,
      columns: [
        { header: "Alumno", key: "name", width: 30 },
        { header: "Sección", key: "section", width: 16 },
        { header: "Encargado", key: "guardian", width: 28 },
        { header: "Teléfono", key: "phone", width: 12 },
        { header: "Correo", key: "email", width: 28 },
        { header: "Saldo (₡)", key: "balance", width: 13, type: "crc" },
        { header: "Vencido (₡)", key: "overdue", width: 13, type: "crc" },
        { header: "Saldo (US$)", key: "usd", width: 12, type: "usd" },
        { header: "Último pago", key: "lastPay", width: 12, type: "date" },
      ],
      rows,
      totals: { name: "Total", balance: sum("balance"), overdue: sum("overdue"), usd: sum("usd") },
    },
  ]);
  return xlsxResponse(buf, `${onlyOverdue ? "morosidad" : "saldos"}-${todayKey()}.xlsx`);
}
