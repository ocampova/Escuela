"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { calendarLinks, calendarToken } from "@/lib/ics";

/** Genera un enlace nuevo; el anterior deja de funcionar (por si se compartió por error). */
export async function rotateCalendarLink() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Sesión expirada");
  const links = calendarLinks(await calendarToken(user.id, true));
  revalidatePath(user.role === "GUARDIAN" ? "/familia/calendario" : "/escuela/calendario");
  return links;
}
