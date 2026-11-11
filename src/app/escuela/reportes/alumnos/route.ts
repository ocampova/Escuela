import { NextResponse } from "next/server";
import { getCurrentUser, isManager } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { staffSections } from "@/lib/queries";
import { gradeSectionName, todayKey } from "@/lib/format";
import { buildWorkbook, excelDate, xlsxResponse } from "@/lib/xlsx";

/** Lista de alumnos con encargados, salud y autorizados para recoger. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !isManager(user)) return new NextResponse("No autorizado", { status: 401 });
  const sections = await staffSections(user);
  const students = await prisma.student.findMany({
    where: { sectionId: { in: sections.map((s) => s.id) } },
    include: { section: { include: { grade: { include: { level: true } } } }, guardians: { include: { user: true }, orderBy: { isPrimary: "desc" } }, pickups: true },
    orderBy: [{ section: { grade: { level: { order: "asc" } } } }, { section: { grade: { order: "asc" } } }, { section: { name: "asc" } }, { lastName: "asc" }],
  });
  const rows = students.map((s) => {
    const [g1, g2] = s.guardians;
    return {
      level: s.section.grade.level.name,
      section: gradeSectionName(s.section),
      last: s.lastName,
      first: s.firstName,
      id: s.idNumber ?? "",
      birth: excelDate(s.birthDate),
      blood: s.bloodType ?? "",
      allergies: s.allergies ?? "",
      medical: s.medicalNotes ?? "",
      photos: s.photoConsent === true ? "Sí" : s.photoConsent === false ? "No" : "Sin respuesta",
      g1: g1 ? `${g1.user.name} (${g1.relationship})` : "",
      g1phone: g1?.user.phone ?? "",
      g1email: g1?.user.email ?? "",
      g2: g2 ? `${g2.user.name} (${g2.relationship})` : "",
      g2phone: g2?.user.phone ?? "",
      pickups: s.pickups.map((p) => `${p.name} (${p.relationship}, ${p.idNumber})`).join("; "),
    };
  });
  const buf = await buildWorkbook([
    {
      name: "Alumnos",
      title: `Lista de alumnos (${rows.length})`,
      subtitle: `${user.school.name} · generado el ${todayKey().split("-").reverse().join("/")} · contiene datos personales y de salud: compártalo solo con quien lo necesite`,
      columns: [
        { header: "Nivel", key: "level", width: 12 },
        { header: "Sección", key: "section", width: 16 },
        { header: "Apellidos", key: "last", width: 20 },
        { header: "Nombre", key: "first", width: 14 },
        { header: "Cédula", key: "id", width: 14 },
        { header: "Nacimiento", key: "birth", width: 12, type: "date" },
        { header: "Sangre", key: "blood", width: 8 },
        { header: "Alergias", key: "allergies", width: 18 },
        { header: "Notas médicas", key: "medical", width: 24 },
        { header: "Fotos", key: "photos", width: 12 },
        { header: "Encargado principal", key: "g1", width: 30 },
        { header: "Teléfono", key: "g1phone", width: 12 },
        { header: "Correo", key: "g1email", width: 28 },
        { header: "Otro encargado", key: "g2", width: 30 },
        { header: "Teléfono", key: "g2phone", width: 12 },
        { header: "Autorizados para recoger", key: "pickups", width: 50 },
      ],
      rows,
    },
  ]);
  return xlsxResponse(buf, `alumnos-${todayKey()}.xlsx`);
}
