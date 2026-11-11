import "server-only";
import { after } from "next/server";
import { prisma } from "./db";
import { emailLayout, mailEnabled, sendMany, sendMail } from "./mail";
import { appUrl } from "./tokens";
import { dateLabel, money } from "./format";
import { METHOD_LABEL } from "./queries";

function later(fn: () => Promise<unknown>) {
  try {
    after(() => fn().catch(() => {}));
  } catch {
    fn().catch(() => {});
  }
}

/** Aviso nuevo por correo a las familias destinatarias que lo tienen activado. */
export function mailAnnouncement(announcementId: string, recipientIds: string[]) {
  if (!mailEnabled() || recipientIds.length === 0) return;
  later(async () => {
    const a = await prisma.announcement.findUnique({ where: { id: announcementId }, include: { author: true, _count: { select: { images: true } } } });
    if (!a) return;
    const users = await prisma.user.findMany({ where: { id: { in: recipientIds }, active: true, emailNotices: true }, select: { email: true, name: true } });
    const url = appUrl(`/familia/avisos/${a.id}`);
    const body = a.body ? (a.body.length > 600 ? a.body.slice(0, 597) + "…" : a.body) : "";
    const extra = [
      ...(a._count.images ? [`Este aviso incluye ${a._count.images === 1 ? "una imagen" : `${a._count.images} imágenes`}; véalas en la plataforma.`] : []),
      ...(a.permissionQuestion ? [`La escuela pide su autorización: «${a.permissionQuestion}»`] : []),
    ];
    await sendMany(
      users.map((u) => {
        const { html, text } = emailLayout({
          preheader: body.slice(0, 120) || a.title,
          title: a.title,
          paragraphs: [`Hola, ${u.name.split(" ")[0]}:`, ...(body ? [body] : []), ...extra, `— ${a.author.name}`],
          cta: { label: a.permissionQuestion ? "Responder la autorización" : a.requiresAck ? "Ver el aviso y confirmar" : "Ver el aviso", url },
        });
        return { to: u.email, subject: a.permissionQuestion ? `Autorización: ${a.title}` : `Aviso: ${a.title}`, text, html };
      }),
    );
  });
}

/** Recibo por correo a los encargados del alumno que lo tienen activado. */
export function mailReceipt(paymentId: string) {
  if (!mailEnabled()) return;
  later(async () => {
    const p = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { student: { include: { guardians: { include: { user: { select: { email: true, name: true, active: true, emailReceipts: true } } } } } } },
    });
    if (!p) return;
    const url = appUrl(`/recibos/${p.id}`);
    await sendMany(
      p.student.guardians
        .filter((g) => g.user.active && g.user.emailReceipts)
        .map((g) => {
          const { html, text } = emailLayout({
            preheader: `Recibimos su pago de ${money(p.amount, p.currency)}.`,
            title: `Recibo n.º ${p.receiptNumber}`,
            paragraphs: [`Hola, ${g.user.name.split(" ")[0]}:`, `Registramos el pago de ${p.student.firstName} ${p.student.lastName}. ¡Gracias!`],
            details: [
              ["Concepto", p.note ?? "Pago"],
              ["Monto", money(p.amount, p.currency)],
              ["Fecha del pago", dateLabel(p.paidAt, { day: "numeric", month: "long", year: "numeric" })],
              ["Forma de pago", METHOD_LABEL[p.method]],
              ...(p.reference ? ([["Referencia", p.reference]] as [string, string][]) : []),
            ],
            cta: { label: "Ver o descargar el recibo", url },
          });
          return { to: g.user.email, subject: `Recibo de pago n.º ${p.receiptNumber} · San Cayetano School`, text, html };
        }),
    );
  });
}

/** Correo de invitación o cambio de contraseña. */
export async function mailAccessLink(to: string, name: string, purpose: "INVITE" | "RESET", link: string) {
  const first = name.split(" ")[0];
  const { html, text } =
    purpose === "INVITE"
      ? emailLayout({
          preheader: "Cree su contraseña para entrar a la plataforma de la escuela.",
          title: "Le damos la bienvenida a la plataforma",
          paragraphs: [`Hola, ${first}:`, "San Cayetano School le invita a su plataforma: avisos, mensajes, calendario, asistencia y estado de cuenta en un solo lugar.", "El enlace vence en 14 días."],
          cta: { label: "Crear mi contraseña", url: link },
        })
      : emailLayout({
          preheader: "Enlace para crear una contraseña nueva.",
          title: "Cambiar su contraseña",
          paragraphs: [`Hola, ${first}:`, "Para crear una contraseña nueva, use el botón. El enlace vence en 2 horas.", "Si usted no lo pidió, ignore este correo."],
          cta: { label: "Crear contraseña nueva", url: link },
        });
  return sendMail({ to, subject: purpose === "INVITE" ? "Invitación a la plataforma de San Cayetano School" : "Cambiar su contraseña · San Cayetano School", text, html });
}

/** Confirmación de solicitud de matrícula. */
export async function mailApplicationReceived(to: string, guardianName: string, childName: string, grade: string, year: string, phone: string) {
  const { html, text } = emailLayout({
    preheader: `Recibimos la solicitud de matrícula de ${childName}.`,
    title: "Recibimos su solicitud de matrícula",
    paragraphs: [`Hola, ${guardianName.split(" ")[0]}:`, `Recibimos la solicitud de ${childName} para ${grade} (curso lectivo ${year}). Secretaría le contactará pronto al ${phone} para coordinar una visita y los siguientes pasos.`],
    footnote: "Recibe este correo porque envió una solicitud de matrícula a San Cayetano School.",
  });
  return sendMail({ to, subject: "San Cayetano School: recibimos su solicitud de matrícula", text, html });
}
