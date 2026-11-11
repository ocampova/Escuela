"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";
import type { ActionState } from "@/components/action-form";

export async function updateContact(_p: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireGuardian();
  const p = z
    .object({
      email: z.string().trim().toLowerCase().email("Escriba un correo válido."),
      phone: z.string().trim().min(8, "Escriba un teléfono de al menos 8 dígitos.").max(20),
    })
    .safeParse(Object.fromEntries(f));
  if (!p.success) return { error: p.error.issues[0].message };
  if (p.data.email !== user.email && (await prisma.user.findUnique({ where: { email: p.data.email } }))) return { error: "Ese correo ya está registrado en otra cuenta." };
  await prisma.user.update({ where: { id: user.id }, data: p.data });
  revalidatePath("/familia", "layout");
  return { ok: p.data.email !== user.email ? "Datos guardados. Desde ahora entre con su correo nuevo." : "Datos guardados." };
}

export async function changePassword(_p: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireGuardian();
  const current = String(f.get("current") ?? "");
  const next = String(f.get("next") ?? "");
  if (next.length < 8) return { error: "La contraseña nueva debe tener al menos 8 caracteres." };
  if (next !== String(f.get("confirm") ?? "")) return { error: "Las contraseñas nuevas no coinciden." };
  const full = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!full.passwordHash || !(await bcrypt.compare(current, full.passwordHash))) return { error: "La contraseña actual no es correcta." };
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 10) } });
  return { ok: "Contraseña cambiada." };
}

export async function updatePreferences(_p: ActionState, f: FormData): Promise<ActionState> {
  const user = await requireGuardian();
  const kids = await prisma.studentGuardian.findMany({ where: { userId: user.id }, select: { studentId: true } });
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { emailNotices: f.get("emailNotices") === "on", emailReceipts: f.get("emailReceipts") === "on" } }),
    ...kids
      .filter((k) => ["yes", "no"].includes(String(f.get(`photo-${k.studentId}`))))
      .map((k) => prisma.student.update({ where: { id: k.studentId }, data: { photoConsent: f.get(`photo-${k.studentId}`) === "yes" } })),
  ]);
  revalidatePath("/familia", "layout");
  revalidatePath("/escuela", "layout");
  return { ok: "Preferencias guardadas." };
}
