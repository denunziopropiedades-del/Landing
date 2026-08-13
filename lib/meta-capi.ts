import crypto from "node:crypto";

const PIXEL_ID = process.env.META_CONVERSIONS_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CONVERSIONS_ACCESS_TOKEN;
const GRAPH_VERSION = "v21.0";

export function isMetaConversionsConfigured() {
  return Boolean(PIXEL_ID && ACCESS_TOKEN);
}

function hashSha256(valor: string): string {
  return crypto.createHash("sha256").update(valor.trim().toLowerCase()).digest("hex");
}

type EventoConversion = {
  nombreEvento: "Lead" | "Purchase";
  email?: string;
  telefono?: string;
  valor?: number;
  moneda?: string;
  urlOrigen?: string;
};

/**
 * Avisa a Meta (vía la API de conversiones, del lado del servidor) cuando un
 * lead avanza a una etapa real del embudo (reserva, pago confirmado), para
 * que el algoritmo de anuncios optimice según ventas reales y no solo según
 * quién completó el formulario. No lanza si falla (no debe romper el flujo
 * principal) ni si no está configurado.
 */
export async function enviarEventoConversion(evento: EventoConversion): Promise<void> {
  if (!isMetaConversionsConfigured()) return;

  const userData: Record<string, unknown> = {};
  if (evento.email) userData.em = [hashSha256(evento.email)];
  if (evento.telefono) userData.ph = [hashSha256(evento.telefono.replace(/\D/g, ""))];

  const payload = {
    data: [
      {
        event_name: evento.nombreEvento,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: evento.urlOrigen ?? process.env.NEXT_PUBLIC_SITE_URL,
        user_data: userData,
        ...(evento.valor ? { custom_data: { value: evento.valor, currency: evento.moneda ?? "ARS" } } : {}),
      },
    ],
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) {
      console.error("Error enviando evento de conversión a Meta", await res.text());
    }
  } catch (err) {
    console.error("Error de conexión con la API de conversiones de Meta", err);
  }
}
