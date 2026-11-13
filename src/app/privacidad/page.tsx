import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { PublicShell } from "@/components/public-shell";

export const metadata: Metadata = { title: "Aviso de privacidad" };
export const dynamic = "force-dynamic";

/**
 * Borrador basado en la Ley 8968 (Protección de la Persona frente al Tratamiento de sus
 * Datos Personales). Debe revisarlo la dirección y, idealmente, una persona abogada.
 */
export default async function PrivacyPage() {
  const school = await prisma.school.findFirst({ select: { name: true, email: true } });
  const name = school?.name ?? "San Cayetano School";
  const email = school?.email ?? "la dirección de la escuela";
  const sections: [string, string[]][] = [
    ["Quién es responsable", [`${name}, Santa Gertrudis Norte, Grecia, Costa Rica, es responsable de la base de datos de esta plataforma. Contacto: ${email}.`]],
    [
      "Qué datos tratamos",
      [
        "De las personas encargadas: nombre, cédula, correo, teléfono y parentesco.",
        "De los estudiantes: nombre, cédula, fecha de nacimiento, sección, asistencia, evaluaciones y estado de cuenta.",
        "Datos sensibles de salud que la familia decida informar (alergias, tipo de sangre, condiciones médicas), para cuidar al estudiante.",
        "Personas autorizadas para recoger al estudiante, documentos de matrícula y comprobantes de pago.",
        "Fotografías del estudiante solo si la familia lo autoriza.",
      ],
    ],
    [
      "Para qué los usamos",
      [
        "Administrar la matrícula, la asistencia, la seguridad a la salida y los cobros.",
        "Comunicarnos con la familia: avisos, mensajes, calendario y notificaciones.",
        "Cumplir obligaciones con el Ministerio de Educación Pública cuando corresponda.",
        "No vendemos ni usamos los datos con fines publicitarios.",
      ],
    ],
    [
      "Con quién los compartimos",
      [
        "Solo con el personal de la escuela que los necesita para su trabajo (por ejemplo, la docente ve únicamente a sus secciones).",
        "Con proveedores que hacen funcionar la plataforma (alojamiento del servidor y envío de correos), que no pueden usarlos para otros fines.",
        "Con autoridades cuando la ley lo exija.",
      ],
    ],
    [
      "Fotografías",
      ["Las fotos de los estudiantes se muestran solo a las familias de su sección y nunca de forma pública. Cada familia puede autorizarlo o no, y cambiar su decisión en cualquier momento desde su perfil."],
    ],
    [
      "Sus derechos",
      [
        `Puede pedir acceso a sus datos y a los de su hijo, su rectificación o su eliminación, y revocar su consentimiento, escribiendo a ${email}. Responderemos en los plazos que establece la Ley 8968.`,
        "Si considera que sus derechos no fueron atendidos, puede acudir a la Agencia de Protección de Datos de los Habitantes (PRODHAB).",
      ],
    ],
    ["Cuánto tiempo los guardamos", ["Mientras el estudiante esté matriculado y, después, solo el tiempo que exijan las obligaciones legales y administrativas."]],
  ];
  return (
    <PublicShell title="Aviso de privacidad" subtitle={`Cómo ${name} protege los datos de su familia.`}>
      <div className="space-y-6">
        {sections.map(([h, ps]) => (
          <section key={h}>
            <h2 className="mb-2 text-[15px] font-semibold">{h}</h2>
            {ps.length > 1 ? (
              <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-ink-2">
                {ps.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            ) : (
              <p className="text-[15px] leading-relaxed text-ink-2">{ps[0]}</p>
            )}
          </section>
        ))}
        <p className="text-xs text-ink-3">Versión 1 · noviembre de 2026.</p>
        <Link href="/login" className="tap inline-block text-sm font-medium text-brand hover:underline">
          Volver a la plataforma
        </Link>
      </div>
    </PublicShell>
  );
}
