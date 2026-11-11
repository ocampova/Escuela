import { NextResponse } from "next/server";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { METHOD_LABEL } from "@/lib/queries";
import { gradeSectionName, todayKey } from "@/lib/format";
import { buildWorkbook, excelDate, xlsxResponse } from "@/lib/xlsx";

const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

/** Pagos recibidos en un mes (para contabilidad y conciliación bancaria). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !isManager(user)) return new NextResponse("No autorizado", { status: 401 });
  const month = new URL(req.url).searchParams.get("mes") ?? todayKey().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return new NextResponse("Mes no válido", { status: 400 });
  const [y, m] = month.split("-").map(Number);
  const payments = await prisma.payment.findMany({
    where: { paidAt: { gte: new Date(Date.UTC(y, m - 1, 1)), lte: new Date(Date.UTC(y, m, 0)) }, student: { section: { schoolYear: { schoolId: user.schoolId } } } },
    include: { student: { include: { section: { include: { grade: true } } } }, loggedBy: { select: { name: true } } },
    orderBy: [{ paidAt: "asc" }, { receiptNumber: "asc" }],
  });
  const rows = payments.map((p) => ({
    n: p.receiptNumber,
    date: excelDate(p.paidAt),
    student: `${p.student.lastName}, ${p.student.firstName}`,
    section: gradeSectionName(p.student.section),
    concept: p.note ?? "",
    method: METHOD_LABEL[p.method],
    ref: p.reference ?? "",
    crc: p.currency === "CRC" ? p.amount : null,
    usd: p.currency === "USD" ? p.amount : null,
    by: p.loggedBy?.name ?? "",
  }));
  const buf = await buildWorkbook([
    {
      name: "Pagos",
      title: `Pagos recibidos en ${MONTHS[m - 1]} de ${y} (${rows.length})`,
      subtitle: user.school.name,
      columns: [
        { header: "Recibo", key: "n", width: 9, type: "int" },
        { header: "Fecha", key: "date", width: 12, type: "date" },
        { header: "Alumno", key: "student", width: 30 },
        { header: "Sección", key: "section", width: 16 },
        { header: "Concepto", key: "concept", width: 24 },
        { header: "Medio", key: "method", width: 14 },
        { header: "Referencia", key: "ref", width: 16 },
        { header: "Monto (₡)", key: "crc", width: 13, type: "crc" },
        { header: "Monto (US$)", key: "usd", width: 12, type: "usd" },
        { header: "Registrado por", key: "by", width: 24 },
      ],
      rows,
      totals: { student: "Total", crc: rows.reduce((a, r) => a + (r.crc ?? 0), 0), usd: rows.reduce((a, r) => a + (r.usd ?? 0), 0) },
    },
  ]);
  return xlsxResponse(buf, `pagos-${month}.xlsx`);
}
