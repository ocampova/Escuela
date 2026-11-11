"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireGuardian } from "@/lib/auth";

export type ConsentState = { error?: string };

/** Guarda la aceptación del aviso de privacidad y la autorización de fotos de cada hijo. */
export async function acceptPrivacy(_p: ConsentState, f: FormData): Promise<ConsentState> {
  const user = await requireGuardian();
  if (f.get("accept") !== "on") return { error: "Para usar la plataforma debe aceptar el aviso de privacidad." };
  const kids = await prisma.studentGuardian.findMany({ where: { userId: user.id }, select: { studentId: true } });
  const missing = kids.filter((k) => !["yes", "no"].includes(String(f.get(`photo-${k.studentId}`))));
  if (missing.length) return { error: "Indique si autoriza o no las fotos de cada uno de sus hijos." };
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { privacyAcceptedAt: new Date() } }),
    ...kids.map((k) => prisma.student.update({ where: { id: k.studentId }, data: { photoConsent: f.get(`photo-${k.studentId}`) === "yes" } })),
  ]);
  redirect("/familia");
}
