import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Solicitud recibida" };

export default function ThanksPage() {
  return (
    <PublicShell title="¡Solicitud recibida!">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-ok" aria-hidden />
        <p className="mt-4 text-[15px]">Gracias por su interés en San Cayetano School.</p>
        <p className="mt-2 text-sm text-ink-2">Secretaría revisará la solicitud y le contactará por teléfono o WhatsApp en los próximos días hábiles.</p>
        <Link href="/matricula" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Enviar otra solicitud</Link>
      </div>
    </PublicShell>
  );
}
