import Link from "next/link";
import type { Metadata } from "next";
import { findValidToken } from "@/lib/tokens";
import { AuthShell } from "@/components/auth-shell";
import { PasswordForm } from "@/app/activar/password-form";

export const metadata: Metadata = { title: "Activar cuenta" };

export default async function ActivatePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await findValidToken(token);
  if (!t || t.purpose !== "INVITE") {
    return (
      <AuthShell title="Enlace no válido">
        <p className="text-sm text-ink-2">Este enlace de invitación venció o ya se usó. Pídale a la escuela que le envíe uno nuevo.</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Ir a entrar</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title={`Hola, ${t.user.name.split(" ")[0]}`} subtitle="Cree su contraseña para entrar a la plataforma de San Cayetano School.">
      <PasswordForm token={token} email={t.user.email} cta="Activar mi cuenta" />
    </AuthShell>
  );
}
