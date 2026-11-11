import Link from "next/link";
import type { Metadata } from "next";
import { findValidToken } from "@/lib/tokens";
import { AuthShell } from "@/components/auth-shell";
import { PasswordForm } from "@/app/activar/password-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await findValidToken(token);
  if (!t || t.purpose !== "RESET") {
    return (
      <AuthShell title="Enlace no válido">
        <p className="text-sm text-ink-2">Este enlace venció o ya se usó. Puede pedir otro desde «Olvidé mi contraseña».</p>
        <Link href="/login" className="mt-4 inline-block text-sm font-medium text-brand hover:underline">Ir a entrar</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell title="Contraseña nueva" subtitle="Escriba una contraseña nueva para su cuenta.">
      <PasswordForm token={token} email={t.user.email} cta="Guardar contraseña" />
    </AuthShell>
  );
}
