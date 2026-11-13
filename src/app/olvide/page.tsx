import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Olvidé mi contraseña" };

export default function ForgotPage() {
  return (
    <AuthShell
      title="¿Olvidó su contraseña?"
      subtitle="Le enviamos un enlace a su correo para crear una nueva."
      footer={<Link href="/login" className="tap text-sm font-medium text-brand hover:underline">Volver a entrar</Link>}
    >
      <ForgotForm />
    </AuthShell>
  );
}
