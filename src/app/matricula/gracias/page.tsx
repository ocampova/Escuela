import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { FORMAL_STEPS } from "@/lib/enrollment";

export const metadata: Metadata = { title: "Solicitud recibida" };

export default function ThanksPage() {
  return (
    <PublicShell title="¡Solicitud recibida!">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-12 text-ok" aria-hidden />
        <p className="mt-4 text-[15px]">Gracias por su interés en San Cayetano School.</p>
        <p className="mt-2 text-sm text-ink-2">Secretaría revisará la solicitud y le contactará por teléfono o WhatsApp en los próximos días hábiles.</p>
        <div className="mt-6 rounded-xl bg-canvas p-4 text-left">
          <p className="text-sm font-medium">Para formalizar la matrícula, tenga a mano:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-2">
            {FORMAL_STEPS.filter((s) => s.key !== "expediente").map((s) => (
              <li key={s.key}>{s.label}</li>
            ))}
          </ul>
        </div>
        <Link href="/matricula" className="mt-6 inline-block text-sm font-medium text-brand hover:underline">Enviar otra solicitud</Link>
      </div>
    </PublicShell>
  );
}
