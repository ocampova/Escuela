"use server";

import { readSheet } from "read-excel-file/node";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import type { ImportRow } from "../actions";

export type PreviewRow = ImportRow & { line: number; sectionLabel: string; existingGuardian: boolean };
export type Preview = { rows: PreviewRow[]; errors: { line: number; message: string }[]; error?: string };

const COLUMNS = [
  "Nombre",
  "Apellidos",
  "Cédula",
  "Fecha de nacimiento",
  "Grado",
  "Sección",
  "Alergias",
  "Encargado",
  "Parentesco",
  "Correo encargado",
  "Teléfono encargado",
  "Sexo",
  "Nacionalidad",
  "Fecha de ingreso",
  "Repite",
  "Adecuación",
] as const;

/** Columnas que se pueden omitir (los datos para el MEP se completan después en la ficha). */
const OPTIONAL = new Set<string>(["Cédula", "Alergias", "Teléfono encargado", "Sexo", "Nacionalidad", "Fecha de ingreso", "Repite", "Adecuación"]);

function parseSex(v: string) {
  const n = norm(v);
  if (["f", "femenino", "mujer", "nina"].includes(n)) return "F";
  if (["m", "masculino", "hombre", "nino"].includes(n)) return "M";
  return n ? undefined : null;
}

function parseAdaptation(v: string) {
  const n = norm(v);
  if (!n || n === "no" || n.startsWith("sin") || n === "ninguna") return "NONE";
  if (n.includes("no significativa")) return "NON_SIGNIFICANT";
  if (n.includes("significativa")) return "SIGNIFICANT";
  if (n.includes("acceso")) return "ACCESS";
  return undefined;
}

const norm = (v: unknown) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((x) => x.trim()));
}

function toIsoDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v ?? "").trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Lee el archivo y valida cada fila sin guardar nada. */
export async function previewImport(form: FormData): Promise<Preview> {
  const user = await requireStaff();
  if (!isManager(user)) return { rows: [], errors: [], error: "Solo Dirección y Secretaría importan alumnos." };
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { rows: [], errors: [], error: "Elija un archivo." };
  if (file.size > 5 * 1024 * 1024) return { rows: [], errors: [], error: "El archivo pesa más de 5 MB." };

  let table: unknown[][];
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    table = /\.xlsx$/i.test(file.name) ? ((await readSheet(buf)) as unknown[][]) : parseCsv(buf.toString("utf8"));
  } catch {
    return { rows: [], errors: [], error: "No se pudo leer el archivo. Use la plantilla en formato .xlsx o .csv." };
  }
  if (table.length < 2) return { rows: [], errors: [], error: "El archivo no tiene filas de alumnos." };

  const header = table[0].map(norm);
  const idx = Object.fromEntries(COLUMNS.map((c) => [c, header.indexOf(norm(c))])) as Record<(typeof COLUMNS)[number], number>;
  const missing = COLUMNS.filter((c) => idx[c] === -1 && !OPTIONAL.has(c));
  if (missing.length) return { rows: [], errors: [], error: `Faltan columnas: ${missing.join(", ")}. Descargue la plantilla.` };

  const sections = await prisma.section.findMany({ where: { schoolYear: { schoolId: user.schoolId, active: true } }, include: { grade: true } });
  const emails = new Map((await prisma.user.findMany({ where: { schoolId: user.schoolId }, select: { email: true, role: true } })).map((u) => [u.email, u.role]));

  const rows: PreviewRow[] = [];
  const errors: Preview["errors"] = [];
  table.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (c: (typeof COLUMNS)[number]) => (idx[c] >= 0 ? String(r[idx[c]] ?? "").trim() : "");
    const firstName = get("Nombre");
    const lastName = get("Apellidos");
    if (!firstName && !lastName) return;
    const problems: string[] = [];
    if (firstName.length < 2) problems.push("falta el nombre");
    if (lastName.length < 3) problems.push("faltan los apellidos");
    const birthDate = toIsoDate(idx["Fecha de nacimiento"] >= 0 ? r[idx["Fecha de nacimiento"]] : "");
    if (!birthDate) problems.push("fecha de nacimiento no válida (use dd/mm/aaaa)");
    const section = sections.find((s) => norm(s.grade.name) === norm(get("Grado")) && norm(s.name) === norm(get("Sección")));
    if (!section) problems.push(`no existe la sección «${get("Grado")} ${get("Sección")}»`);
    const guardianEmail = get("Correo encargado").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianEmail)) problems.push("correo del encargado no válido");
    else if (emails.get(guardianEmail) && emails.get(guardianEmail) !== "GUARDIAN") problems.push("el correo del encargado pertenece al personal");
    const guardianName = get("Encargado");
    if (guardianName.length < 5) problems.push("falta el nombre del encargado");
    const sex = parseSex(get("Sexo"));
    if (sex === undefined) problems.push(`sexo «${get("Sexo")}» no válido (use F o M)`);
    const adaptation = parseAdaptation(get("Adecuación"));
    if (adaptation === undefined) problems.push(`adecuación «${get("Adecuación")}» no válida (acceso, no significativa o significativa)`);
    const enrolledRaw = idx["Fecha de ingreso"] >= 0 ? r[idx["Fecha de ingreso"]] : "";
    const enrolledOn = String(enrolledRaw ?? "").trim() ? toIsoDate(enrolledRaw) : null;
    if (String(enrolledRaw ?? "").trim() && !enrolledOn) problems.push("fecha de ingreso no válida (use dd/mm/aaaa)");
    if (problems.length) {
      errors.push({ line, message: `${firstName} ${lastName}: ${problems.join("; ")}.` });
      return;
    }
    rows.push({
      line,
      firstName,
      lastName,
      idNumber: get("Cédula") || null,
      birthDate: birthDate!,
      sectionId: section!.id,
      sectionLabel: `${section!.grade.name} ${section!.name}`,
      allergies: get("Alergias") || null,
      sex: sex ?? null,
      nationality: get("Nacionalidad") || null,
      enrolledOn,
      repeating: ["si", "sí", "s", "x", "repite"].includes(norm(get("Repite"))),
      adaptation: adaptation ?? "NONE",
      guardianName,
      guardianEmail,
      guardianPhone: get("Teléfono encargado") || null,
      relationship: get("Parentesco") || "Encargado",
      existingGuardian: emails.has(guardianEmail) || rows.some((x) => x.guardianEmail === guardianEmail),
    });
  });
  return { rows, errors };
}
