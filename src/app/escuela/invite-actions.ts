"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { isManager, requireStaff } from "@/lib/auth";
import { issueToken, linkFor } from "@/lib/tokens";
import { mailEnabled } from "@/lib/mail";
import { mailAccessLink } from "@/lib/emails";

export type InviteResult = { link?: string; emailed?: boolean; error?: string; whatsapp?: string };

function waLink(phone: string | null, text: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  const num = digits.length === 8 ? `506${digits}` : digits;
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
}

/** Genera un enlace de invitación (o de cambio de contraseña) para un usuario de la escuela. */
export async function createInvite(userId: string): Promise<InviteResult> {
  const me = await requireStaff();
  if (!isManager(me)) return { error: "Solo Dirección y Secretaría envían invitaciones." };
  const user = await prisma.user.findFirst({ where: { id: userId, schoolId: me.schoolId } });
  if (!user) return { error: "Usuario no encontrado." };

  const purpose = user.passwordHash ? "RESET" : "INVITE";
  const token = await issueToken(user.id, purpose);
  const link = linkFor(purpose, token);
  const first = user.name.split(" ")[0];
  const text =
    purpose === "INVITE"
      ? `Hola, ${first}. San Cayetano School le invita a su plataforma: avisos, calendario, asistencia y estado de cuenta. Cree su contraseña aquí (vence en 14 días): ${link}`
      : `Hola, ${first}. Este es su enlace para crear una contraseña nueva en la plataforma de San Cayetano School (vence en 2 horas): ${link}`;
  const emailed = mailEnabled()
    ? await mailAccessLink(user.email, user.name, purpose, link)
    : false;
  revalidatePath("/escuela", "layout");
  return { link, emailed, whatsapp: waLink(user.phone, text) };
}
