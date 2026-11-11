import "server-only";
import ExcelJS from "exceljs";
import { NextResponse } from "next/server";

export type Column = { header: string; key: string; width?: number; type?: "text" | "crc" | "usd" | "date" | "int" | "pct" | "center" };
export type Sheet = { name: string; title: string; subtitle?: string; columns: Column[]; rows: Record<string, unknown>[]; totals?: Record<string, unknown> };

const BRAND = "FF12463A";
const FORMATS: Record<string, string> = { crc: '"₡"#,##0', usd: '"US$"#,##0.00', date: "dd/mm/yyyy", int: "0", pct: "0%" };

/** Libro de Excel con el membrete de la escuela: título, subtítulo, encabezados verdes y fila fija. */
export async function buildWorkbook(sheets: Sheet[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "San Cayetano School";
  wb.created = new Date();
  for (const sh of sheets) {
    const ws = wb.addWorksheet(sh.name.slice(0, 31), { views: [{ state: "frozen", ySplit: 4 }] });
    ws.columns = sh.columns.map((c) => ({ key: c.key, width: c.width ?? Math.max(12, c.header.length + 2) }));
    ws.getCell("A1").value = sh.title;
    ws.getCell("A1").font = { bold: true, size: 14, color: { argb: BRAND } };
    ws.getCell("A2").value = sh.subtitle ?? "";
    ws.getCell("A2").font = { size: 10, color: { argb: "FF5F6F68" } };
    const header = ws.getRow(4);
    sh.columns.forEach((c, i) => {
      const cell = header.getCell(i + 1);
      cell.value = c.header;
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
      cell.alignment = { vertical: "middle", horizontal: c.type === "center" ? "center" : c.type && c.type !== "text" ? "right" : "left", wrapText: true };
    });
    header.height = 22;
    for (const r of sh.rows) {
      const row = ws.addRow(r);
      sh.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.type && FORMATS[c.type]) cell.numFmt = FORMATS[c.type];
        if (c.type === "center") cell.alignment = { horizontal: "center" };
      });
    }
    if (sh.totals) {
      const row = ws.addRow(sh.totals);
      row.font = { bold: true };
      sh.columns.forEach((c, i) => {
        const cell = row.getCell(i + 1);
        if (c.type && FORMATS[c.type]) cell.numFmt = FORMATS[c.type];
        cell.border = { top: { style: "thin", color: { argb: "FFCBD5D0" } } };
      });
    }
    ws.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4 + sh.rows.length, column: sh.columns.length } };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export function xlsxResponse(buf: Buffer, filename: string) {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store",
    },
  });
}

/** Fecha @db.Date como Date local para Excel (sin corrimiento de zona). */
// ExcelJS interpreta las fechas en UTC: las columnas @db.Date (medianoche UTC) se escriben tal cual
export const excelDate = (d: Date) => d;
