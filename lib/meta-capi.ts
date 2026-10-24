import crypto from "node:crypto";

const PIXEL_ID = process.env.META_CONVERSIONS_PIXEL_ID;
const ACCESS_TOKEN = process.env.META_CONVERSIONS_ACCESS_TOKEN;
const GRAPH_VERSION = "v26.0"; // la que indica Meta en la guía de integración del CRM

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
    const textoRespuesta = await res.text();
    if (!res.ok) {
      console.error("Error enviando evento de conversión a Meta", textoRespuesta);
    } else {
      console.log("Meta CAPI OK:", evento.nombreEvento, textoRespuesta);
    }
  } catch (err) {
    console.error("Error de conexión con la API de conversiones de Meta", err);
  }
}

/** Nombre de cada etapa del CRM tal como la ve Meta (Administrador de eventos). */
const ETAPAS_CRM: Record<string, string> = {
  nuevo: "Lead",
  contactado: "Contactado",
  visita_programada: "Visita programada",
  visita_realizada: "Visita realizada",
  reservado: "Reservado",
  pago_confirmado: "Pago confirmado",
  pendiente_firma_escribania: "Pendiente firma escribania",
  firmado_escribania: "Firmado escribania",
  vendido: "Vendido",
  descartado: "Descartado",
};

type EventoCrm = {
  estado: string;
  /** id del lead en Meta (leadgen_id), si vino de un formulario de Meta. */
  metaLeadId?: string | null;
  email?: string | null;
  telefono?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

const normalizarTelefono = (t: string) => {
  let d = t.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("0")) d = d.slice(1);
  if (!d.startsWith("54")) d = `54${d}`; // Argentina
  return d;
};

/**
 * Integración de clientes potenciales calificados (CRM → Meta): cada vez que un lead
 * cambia de etapa en el CRM se avisa a Meta, para que optimice los anuncios según
 * quién avanza de verdad (visita, reserva, venta). Usa el mismo conjunto de datos y
 * token que la API de conversiones. Nunca lanza.
 */
export async function enviarEtapaCrm(e: EventoCrm): Promise<void> {
  if (!isMetaConversionsConfigured()) return;
  const etapa = ETAPAS_CRM[e.estado];
  if (!etapa) return;

  const userData: Record<string, unknown> = {};
  const email = e.email?.trim();
  if (email && email.includes("@") && !email.endsWith("@matulotes.app")) userData.em = [hashSha256(email)];
  const tel = e.telefono ? normalizarTelefono(e.telefono) : "";
  if (tel.length >= 10) userData.ph = [hashSha256(tel)];
  if (e.nombre?.trim()) userData.fn = [hashSha256(e.nombre.trim().split(/\s+/)[0])];
  if (e.apellido?.trim()) userData.ln = [hashSha256(e.apellido)];
  if (e.metaLeadId && /^\d{15,17}$/.test(e.metaLeadId)) userData.lead_id = Number(e.metaLeadId);
  if (!userData.em && !userData.ph && !userData.lead_id) return; // sin datos para que Meta lo reconozca

  const payload = {
    data: [
      {
        event_name: etapa,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "system_generated",
        user_data: userData,
        custom_data: { event_source: "crm", lead_event_source: "Matu Lotes CRM" },
      },
    ],
  };
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    const texto = await res.text();
    if (!res.ok) console.error("Meta CRM: error enviando etapa", etapa, texto);
    else console.log("Meta CRM OK:", etapa, texto);
  } catch (err) {
    console.error("Meta CRM: error de conexión", err);
  }
}
