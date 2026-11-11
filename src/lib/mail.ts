import "server-only";

/**
 * Envío de correos. Si RESEND_API_KEY no está configurada, no envía nada y
 * devuelve false: la escuela comparte el enlace por WhatsApp o lo copia.
 */
export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM ?? "San Cayetano School <no-responder@scs.cr>";
  if (!key) {
    if (process.env.NODE_ENV !== "production") console.info(`[correo no enviado: falta RESEND_API_KEY] ${to}: ${subject}`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);
