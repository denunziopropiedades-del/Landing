const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Ayres de Guernica <no-reply@ayresdeguernica.com.ar>";
const EMAIL_TO = process.env.EMAIL_TO ?? "info@ayresdeguernica.com.ar";

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
