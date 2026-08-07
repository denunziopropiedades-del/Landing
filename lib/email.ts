const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Matu Lotes <no-reply@matulotes.com.ar>";
const EMAIL_TO = process.env.EMAIL_TO ?? "denunziopropiedades@gmail.com";

const FIRMA_HTML = `
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-family: sans-serif; color: #333;">
    <p style="margin: 0; font-weight: bold;">DE NUNZIO NEGOCIOS INMOBILIARIOS</p>
    <p style="margin: 4px 0 0 10px;">Matías De Nunzio</p>
    <p style="margin: 0 0 0 10px; color: #666;">Martillero Público</p>
    <p style="margin: 2px 0 0 10px; color: #666;">Tel: 11-2742-4512</p>
  </div>
`;

function conFirma(html: string) {
  return `${html}${FIRMA_HTML}`;
}

async function enviar(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html: conFirma(html),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }

  return { skipped: false as const };
}

/**
 * Envía un email de notificación al dueño del sitio (EMAIL_TO) vía Resend
 * (https://resend.com). Si RESEND_API_KEY no está configurada, no hace nada
 * (modo demo/dev).
 */
export async function sendNotificationEmail(subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: true as const };
  return enviar(EMAIL_TO, subject, html);
}

/**
 * Envía un email a un destinatario puntual (ej. un cliente), a diferencia de
 * sendNotificationEmail que siempre le avisa al dueño del sitio.
 * Si RESEND_API_KEY no está configurada, no hace nada (modo demo/dev).
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !to) return { skipped: true as const };
  return enviar(to, subject, html);
}
