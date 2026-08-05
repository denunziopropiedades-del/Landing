import crypto from "node:crypto";

/**
 * Tolera los formatos habituales en que queda pegada la clave privada al
 * copiarla dentro de una variable de entorno (comillas envolventes, saltos
 * de línea literales "\n" en vez de reales, o finales de línea CRLF), para
 * que `crypto.sign` no falle con ERR_OSSL_UNSUPPORTED por un PEM mal formado.
 */
function normalizarClavePrivada(valor: string | undefined): string | undefined {
  if (!valor) return undefined;

  let clave = valor.trim();

  if (
    (clave.startsWith('"') && clave.endsWith('"')) ||
    (clave.startsWith("'") && clave.endsWith("'"))
  ) {
    clave = clave.slice(1, -1);
  }

  clave = clave.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\r\n/g, "\n").trim();

  return clave;
}

const CLIENT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
const PRIVATE_KEY = normalizarClavePrivada(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID?.trim();
const TIMEZONE = process.env.GOOGLE_CALENDAR_TIMEZONE ?? "America/Argentina/Buenos_Aires";

const DURACION_VISITA_MINUTOS = 45;

/** Tomato/rojo — https://developers.google.com/calendar/api/v3/reference/colors */
const COLOR_ID_ROJO = "11";
const ETIQUETA_VISITA_ONLINE = "VISITA ONLINE";

export function isGoogleCalendarConfigured() {
  return Boolean(CLIENT_EMAIL && PRIVATE_KEY && CALENDAR_ID);
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Intercambia las credenciales de la Service Account por un access token OAuth2 (JWT Bearer flow). */
async function getAccessToken(): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: CLIENT_EMAIL,
    scope: "https://www.googleapis.com/auth/calendar.events",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claim))}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsigned), PRIVATE_KEY!);
  const jwt = `${unsigned}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    throw new Error(`Google auth error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

/** Suma minutos a una fecha/hora (YYYY-MM-DD, HH:MM) y devuelve un datetime local naive (sin offset). */
function sumarMinutos(fecha: string, horario: string, minutos: number) {
  const base = new Date(`${fecha}T${horario}:00Z`);
  base.setUTCMinutes(base.getUTCMinutes() + minutos);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getUTCFullYear()}-${pad(base.getUTCMonth() + 1)}-${pad(base.getUTCDate())}T${pad(base.getUTCHours())}:${pad(base.getUTCMinutes())}:00`;
}

export type VisitaParaCalendario = {
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;
  horario: string;
  proyectoNombre?: string;
};

/**
 * Crea un evento en Google Calendar para una visita agendada, con la etiqueta
 * "VISITA ONLINE" y color rojo. Devuelve el id del evento creado, o null si
 * Google Calendar no está configurado o la creación falla (no bloquea el
 * flujo de reserva).
 */
export async function crearEventoVisita(visita: VisitaParaCalendario): Promise<string | null> {
  if (!isGoogleCalendarConfigured()) return null;

  try {
    const accessToken = await getAccessToken();
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID!)}/events`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: `${ETIQUETA_VISITA_ONLINE} - ${visita.nombre}`,
          description: [
            "Visita agendada desde la web.",
            visita.proyectoNombre ? `Proyecto: ${visita.proyectoNombre}` : null,
            `Teléfono: ${visita.telefono}`,
            `Email: ${visita.email}`,
          ]
            .filter(Boolean)
            .join("\n"),
          start: { dateTime: sumarMinutos(visita.fecha, visita.horario, 0), timeZone: TIMEZONE },
          end: { dateTime: sumarMinutos(visita.fecha, visita.horario, DURACION_VISITA_MINUTOS), timeZone: TIMEZONE },
          colorId: COLOR_ID_ROJO,
          attendees: [{ email: visita.email, displayName: visita.nombre }],
        }),
      }
    );

    if (!res.ok) {
      console.error("Error creando evento de Google Calendar", await res.text());
      return null;
    }

    const data = await res.json();
    return (data.id as string) ?? null;
  } catch (err) {
    console.error("Error de conexión con Google Calendar", err);
    return null;
  }
}

/** Cancela (borra) el evento de Google Calendar asociado a una visita. No lanza si falla. */
export async function cancelarEventoVisita(eventId: string): Promise<void> {
  if (!isGoogleCalendarConfigured() || !eventId) return;

  try {
    const accessToken = await getAccessToken();
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID!)}/events/${eventId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
    );
  } catch (err) {
    console.error("No se pudo cancelar el evento de Google Calendar", err);
  }
}
