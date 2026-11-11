import "server-only";

/**
 * Correo con Resend (https://resend.com), enviado desde el dominio propio de la escuela.
 * Sin RESEND_API_KEY no se envía nada: la plataforma sigue funcionando y los
 * enlaces se comparten por WhatsApp.
 */

export const mailEnabled = () => Boolean(process.env.RESEND_API_KEY);
const FROM = () => process.env.MAIL_FROM ?? "San Cayetano School <avisos@sancayetano.cr>";
const REPLY_TO = () => process.env.MAIL_REPLY_TO ?? "scayetanoschool@gmail.com";

export type Mail = { to: string; subject: string; text: string; html?: string };

async function post(path: string, body: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.warn(`[correo] Resend respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.ok;
}

const payload = (m: Mail) => ({ from: FROM(), reply_to: REPLY_TO(), to: [m.to], subject: m.subject, text: m.text, html: m.html });

export async function sendMail(m: Mail) {
  if (!mailEnabled()) {
    if (process.env.NODE_ENV !== "production") console.info(`[correo no enviado: falta RESEND_API_KEY] ${m.to}: ${m.subject}`);
    return false;
  }
  try {
    return await post("/emails", payload(m));
  } catch {
    return false;
  }
}

/** Envía muchos correos en lotes de 100 (límite de Resend). */
export async function sendMany(mails: Mail[]) {
  if (!mailEnabled() || mails.length === 0) {
    if (mails.length && process.env.NODE_ENV !== "production") console.info(`[correo no enviado: falta RESEND_API_KEY] ${mails.length} correos`);
    return 0;
  }
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const chunk = mails.slice(i, i + 100);
    try {
      if (await post("/emails/batch", chunk.map(payload))) sent += chunk.length;
    } catch {}
  }
  return sent;
}

/* ---------- Plantilla ---------- */

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Correo con la identidad de SCS: franja de colores del logo, encabezado verde,
 * texto legible y un solo botón. Funciona en Gmail, Outlook y Apple Mail (tablas e inline).
 */
export function emailLayout({
  preheader,
  title,
  paragraphs,
  details,
  cta,
  footnote,
}: {
  preheader: string;
  title: string;
  paragraphs: string[];
  details?: [string, string][];
  cta?: { label: string; url: string };
  footnote?: string;
}) {
  const p = paragraphs.map((t) => `<p style="margin:0 0 14px;font-size:16px;line-height:1.55;color:#16231e">${esc(t).replace(/\n/g, "<br>")}</p>`).join("");
  const d = details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 18px;border:1px solid #e2e8e5;border-radius:10px">${details
        .map(
          ([k, v], i) =>
            `<tr><td style="padding:10px 14px;font-size:14px;color:#44554d;${i ? "border-top:1px solid #e2e8e5;" : ""}">${esc(k)}</td><td align="right" style="padding:10px 14px;font-size:14px;font-weight:600;color:#16231e;${i ? "border-top:1px solid #e2e8e5;" : ""}">${esc(v)}</td></tr>`,
        )
        .join("")}</table>`
    : "";
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 6px"><tr><td style="border-radius:10px;background:#12463a"><a href="${esc(cta.url)}" style="display:inline-block;padding:13px 22px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none">${esc(cta.label)}</a></td></tr></table>`
    : "";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f5f7f6;font-family:Lexend,Segoe UI,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f6;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="height:4px;font-size:0;line-height:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background:#d9581f;height:4px"></td><td style="background:#3b8f31;height:4px"></td><td style="background:#1f7fb8;height:4px"></td></tr></table></td></tr>
<tr><td style="background:#12463a;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:600">San Cayetano School</td></tr>
<tr><td style="padding:26px 24px 8px"><h1 style="margin:0 0 14px;font-size:22px;line-height:1.25;color:#16231e">${esc(title)}</h1>${p}${d}${button}</td></tr>
<tr><td style="padding:18px 24px 24px;font-size:12px;line-height:1.5;color:#5f6f68">${esc(footnote ?? "Recibe este correo porque es encargado de un estudiante de San Cayetano School. Puede elegir qué correos recibir en su perfil de la plataforma.")}<br>San Cayetano School · Santa Gertrudis Norte, Grecia, Costa Rica</td></tr>
</table></td></tr></table></body></html>`;
  const text = [title, "", ...paragraphs, ...(details ?? []).map(([k, v]) => `${k}: ${v}`), ...(cta ? ["", `${cta.label}: ${cta.url}`] : [])].join("\n");
  return { html, text };
}
