"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import { notifyLater } from "@/lib/push";

export type ReportState = { error?: string; fields?: Record<string, string> };

const TYPES = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"];

const schema = z.object({
  studentId: z.string().min(1, "Elija el estudiante."),
  concept: z.string().trim().min(3, "Indique qué está pagando.").max(120),
  amount: z.coerce.number().int("Escriba el monto sin decimales.").positive("Escriba el monto pagado."),
  currency: z.enum(["CRC", "USD"]),
  method: z.enum(["TRANSFER", "DEPOSIT", "SINPE"]),
  paidAt: z.string().date("Indique la fecha del pago."),
  reference: z.string().trim().max(60).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function reportPayment(_p: ReportState, f: FormData): Promise<ReportState> {
  const user = await requireGuardian();
  const fields = Object.fromEntries([...f.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  const p = schema.safeParse({ ...fields, amount: (fields.amount ?? "").replace(/[^\d]/g, "") });
  if (!p.success) return { error: p.error.issues[0].message, fields };
  const d = p.data;

  const student = await prisma.student.findFirst({ where: { id: d.studentId, guardians: { some: { userId: user.id } } } });
  if (!student) return { error: "Estudiante no encontrado.", fields };
  if (d.paidAt > new Date().toISOString().slice(0, 10)) return { error: "La fecha del pago no puede ser futura.", fields };

  const file = f.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { error: "Adjunte el comprobante (foto o PDF).", fields };
  if (file.size > 5 * 1024 * 1024) return { error: "El comprobante pesa más de 5 MB.", fields };
  if (!TYPES.includes(file.type)) return { error: "El comprobante debe ser una foto (JPG o PNG) o un PDF.", fields };

  await prisma.paymentReport.create({
    data: {
      studentId: student.id,
      reportedById: user.id,
      amount: d.amount,
      currency: d.currency,
      method: d.method,
      paidAt: new Date(d.paidAt),
      concept: d.concept,
      reference: d.reference || null,
      note: d.note || null,
      fileName: file.name.slice(0, 120),
      mimeType: file.type,
      fileData: new Uint8Array(await file.arrayBuffer()),
    },
  });
  const office = await prisma.user.findMany({ where: { schoolId: user.schoolId, role: { in: ["ADMIN", "STAFF"] }, active: true }, select: { id: true } });
  notifyLater(
    office.map((o) => o.id),
    { title: "Pago reportado por revisar", body: `${student.firstName} ${student.lastName}: ${d.concept}`, url: "/escuela/cobros" },
  );
  revalidatePath("/familia", "layout");
  revalidatePath("/escuela", "layout");
  redirect("/familia/cuenta?reportado=1");
}
