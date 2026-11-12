import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";
import { decodeSession, SESSION_COOKIE } from "./session";

export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await decodeSession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  return prisma.user.findFirst({
    where: { id: session.userId, active: true },
    select: { id: true, name: true, email: true, phone: true, role: true, schoolId: true, school: true, privacyAcceptedAt: true, emailNotices: true, emailReceipts: true, locale: true },
  });
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export async function requireGuardian() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "GUARDIAN") redirect("/escuela");
  return user;
}

export async function requireStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "GUARDIAN") redirect("/familia");
  return user;
}

export function isManager(user: { role: string }) {
  return user.role === "ADMIN" || user.role === "STAFF";
}
