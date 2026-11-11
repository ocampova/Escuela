"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { ENROLL_DOCS, TRANSFER_DOCS } from "@/lib/enrollment";

export type ApplyState = { error?: string; fields?: Record<string, string> };

const MAX = 5 * 1024 * 1024;
const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];
const DOCS = [...ENROLL_DOCS, ...TRANSFER_DOCS].map((d) => [d.field, d.kind, d.step] as const);

const schema = z.object({
  gradeId: z.string().min(1, "Elija el grado al que desea matricular."),
  childFirstName: z.string().trim().min(2, "Escriba el nombre del niño o la niña."),
  childLastName: z.string().trim().min(3, "Escriba los apellidos del niño o la niña."),
  childIdNumber: z.string().trim().max(30).optional(),
  childBirthDate: z.string().date("Escriba la fecha de nacimiento."),
  allergies: z.string().trim().max(300).optional(),
  previousSchool: z.string().trim().max(120).optional(),
  guardianName: z.string().trim().min(5, "Escriba su nombre completo."),
  guardianIdNumber: z.string().trim().max(30).optional(),
  relationship: z.string().trim().min(3, "Indique su parentesco."),
  guardianEmail: z.string().trim().toLowerCase().email("Escriba un correo válido."),
  guardianPhone: z.string().trim().min(8, "Escriba un teléfono de contacto."),
  message: z.string().trim().max(1000).optional(),
  consent: z.literal("on", { message: "Debe aceptar el tratamiento de datos para enviar la solicitud." }),
});

export async function apply(_p: ApplyState, f: FormData): Promise<ApplyState> {
  const fields = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  if (fields.website) redirect("/matricula/gracias"); // trampa para bots
  const p = schema.safeParse(fields);
  if (!p.success) return { error: p.error.issues[0].message, fields };

  const grade = await prisma.grade.findFirst({ where: { id: p.data.gradeId }, include: { level: { include: { school: true } } } });
  if (!grade) return { error: "Grado no válido.", fields };

  const docs: { kind: string; filename: string; mimeType: string; size: number; data: Uint8Array<ArrayBuffer> }[] = [];
  const steps = new Set<string>(["expediente"]);
  for (const [name, kind, step] of DOCS) {
    const file = f.get(name);
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > MAX) return { error: `«${kind}» pesa más de 5 MB.`, fields };
    if (!TYPES.includes(file.type)) return { error: `«${kind}» debe ser PDF o foto (JPG o PNG).`, fields };
    steps.add(step);
    docs.push({ kind, filename: file.name.slice(0, 120), mimeType: file.type, size: file.size, data: new Uint8Array(await file.arrayBuffer()) });
  }

  const d = p.data;
  // De julio en adelante, la matrícula es para el curso lectivo siguiente.
  const now = new Date();
  const forYear = String(now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear());
  await prisma.applicant.create({
    data: {
      schoolId: grade.level.schoolId,
      gradeId: grade.id,
      forYear,
      childFirstName: d.childFirstName,
      childLastName: d.childLastName,
      childIdNumber: d.childIdNumber || null,
      childBirthDate: new Date(d.childBirthDate),
      allergies: d.allergies || null,
      previousSchool: d.previousSchool || null,
      guardianName: d.guardianName,
      guardianIdNumber: d.guardianIdNumber || null,
      relationship: d.relationship,
      guardianEmail: d.guardianEmail,
      guardianPhone: d.guardianPhone,
      message: d.message || null,
      transfer: f.get("transfer") === "on",
      checklist: [...steps],
      documents: { create: docs },
    },
  });
  await sendMail({
    to: d.guardianEmail,
    subject: `${grade.level.school.name}: recibimos su solicitud de matrícula`,
    text: `Hola, ${d.guardianName.split(" ")[0]}:\n\nRecibimos la solicitud de matrícula de ${d.childFirstName} para ${grade.name} (curso lectivo ${forYear}). Secretaría le contactará pronto al ${d.guardianPhone}.\n\n${grade.level.school.name}`,
  });
  redirect("/matricula/gracias");
}
