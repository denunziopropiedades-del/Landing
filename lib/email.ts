const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Matu Lotes <no-reply@matulotes.com.ar>";
const EMAIL_TO = process.env.EMAIL_TO ?? "denunziopropiedades@gmail.com";

/**
 * Envía un email de notificación vía Resend (https://resend.com).
 * Si RESEND_API_KEY no está configurada, no hace nada (modo demo/dev).
 */
export async function sendNotificationEmail(subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: true as const };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [EMAIL_TO],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }

  return { skipped: false as const };
}

/**
 * Envía un email a un destinatario puntual (ej. un cliente), a diferencia de
 * sendNotificationEmail que siempre le avisa al dueño del sitio (EMAIL_TO).
 * Si RESEND_API_KEY no está configurada, no hace nada (modo demo/dev).
 */
export async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY || !to) return { skipped: true as const };

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
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }

  return { skipped: false as const };
}
