import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireGuardian } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AuthShell } from "@/components/auth-shell";
import { ConsentForm } from "./consent-form";

export const metadata: Metadata = { title: "Bienvenida" };

export default async function WelcomePage() {
  const user = await requireGuardian();
  if (user.privacyAcceptedAt) redirect("/familia");
  const kids = await prisma.student.findMany({ where: { guardians: { some: { userId: user.id } } }, select: { id: true, firstName: true, photoConsent: true }, orderBy: { birthDate: "asc" } });
  return (
    <AuthShell title={`Hola, ${user.name.split(" ")[0]}`} subtitle="Un paso antes de entrar.">
      <ConsentForm kids={kids.map((k) => ({ id: k.id, name: k.firstName, consent: k.photoConsent }))} />
    </AuthShell>
  );
}
