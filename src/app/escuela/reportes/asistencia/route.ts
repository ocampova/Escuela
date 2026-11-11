import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { gradeSectionName, todayKey } from "@/lib/format";
import { buildWorkbook, xlsxResponse, type Column } from "@/lib/xlsx";

const LETTER: Record<string, string> = { PRESENT: "P", LATE: "T", ABSENT: "A", EXCUSED: "J" };
const DOW = ["D", "L", "K", "M", "J", "V", "S"];
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "setiembre", "octubre", "noviembre", "diciembre"];

/** Asistencia mensual de una sección (formato de registro: una columna por día lectivo). */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || user.role === "GUARDIAN") return new NextResponse("No autorizado", { status: 401 });
  const url = new URL(req.url);
  const month = url.searchParams.get("mes") ?? todayKey().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(month)) return new NextResponse("Mes no válido", { status: 400 });
  const sections = await staffSections(user);
  const wanted = url.searchParams.get("seccion");
  const chosen = wanted ? sections.filter((s) => s.id === wanted) : sections;
  if (chosen.length === 0) return new NextResponse("Sección no encontrada", { status: 404 });

  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const last = new Date(Date.UTC(y, m, 0));
  const today = todayKey();
  const days: Date[] = [];
  for (let d = new Date(first); d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && d.toISOString().slice(0, 10) <= today) days.push(new Date(d));
  }

  const sheets = [];
  for (const sec of chosen) {
    const students = await prisma.student.findMany({
      where: { sectionId: sec.id },
      include: { attendance: { where: { date: { gte: first, lte: last } } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
    const columns: Column[] = [
      { header: "Estudiante", key: "name", width: 30 },
      { header: "Cédula", key: "id", width: 14 },
      ...days.map((d) => ({ header: `${DOW[d.getUTCDay()]} ${d.getUTCDate()}`, key: `d${d.getUTCDate()}`, width: 5, type: "center" as const })),
      { header: "Presente", key: "P", width: 9, type: "int" },
      { header: "Tardía", key: "T", width: 8, type: "int" },
      { header: "Ausente", key: "A", width: 9, type: "int" },
      { header: "Justif.", key: "J", width: 8, type: "int" },
      { header: "% asist.", key: "pct", width: 9, type: "pct" },
    ];
    const rows = students.map((s) => {
      const row: Record<string, unknown> = { name: `${s.lastName}, ${s.firstName}`, id: s.idNumber ?? "" };
      const c = { P: 0, T: 0, A: 0, J: 0 } as Record<string, number>;
      for (const a of s.attendance) {
        const l = LETTER[a.status];
        row[`d${a.date.getUTCDate()}`] = l;
        c[l]++;
      }
      const total = c.P + c.T + c.A + c.J;
      return { ...row, ...c, pct: total ? (c.P + c.T) / total : null };
    });
    sheets.push({
      name: gradeSectionName(sec),
      title: `Asistencia de ${gradeSectionName(sec)}, ${MONTHS[m - 1]} de ${y}`,
      subtitle: `${user.school.name} · Docente: ${sec.teacher?.name ?? "sin asignar"} · P presente, T tardía, A ausente, J justificada`,
      columns,
      rows,
    });
  }
  const buf = await buildWorkbook(sheets);
  const name = chosen.length === 1 ? gradeSectionName(chosen[0]).replace(/\s+/g, "-") : "todas-las-secciones";
  return xlsxResponse(buf, `asistencia-${name}-${month}.xlsx`);
}
