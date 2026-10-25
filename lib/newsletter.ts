import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

/** Estados del CRM a partir de los cuales una persona ya es cliente
 * (reservó o compró): a esos no se les manda el newsletter de promociones. */
export const ESTADOS_CLIENTE = [
  "reservado",
  "pago_confirmado",
  "pendiente_firma_escribania",
  "firmado_escribania",
  "vendido",
];

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizarEmail = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

export type Destinatario = { email: string; nombre: string };

export type Audiencia = {
  destinatarios: Destinatario[];
  excluidosClientes: number;
  excluidosBajas: number;
  faltaTablaBajas: boolean;
};

/** Trae todas las filas de una consulta, de a 1000 (límite de Supabase). */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const filas: T[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await consulta(desde, desde + 999);
    if (error) throw new Error(error.message);
    filas.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return filas;
}

/** Visitas agendadas (cualquier estado) con email válido, sin repetir, que no
 * son clientes y que no se dieron de baja del newsletter. */
export async function calcularAudiencia(admin: SupabaseClient): Promise<Audiencia> {
  const visitas = await todas<{ email: string | null; nombre: string | null; lead_id: string | null; creado_en: string }>(
    (desde, hasta) =>
      admin.from("visitas").select("email, nombre, lead_id, creado_en").order("creado_en", { ascending: false }).range(desde, hasta)
  );
  const clientes = await todas<{ id: string; email: string | null }>((desde, hasta) =>
    admin.from("leads").select("id, email").in("estado", ESTADOS_CLIENTE).order("id").range(desde, hasta)
  );

  let faltaTablaBajas = false;
  let bajas: { email: string }[] = [];
  try {
    bajas = await todas<{ email: string }>((desde, hasta) => admin.from("newsletter_bajas").select("email").order("email").range(desde, hasta));
  } catch {
    faltaTablaBajas = true;
  }

  const emailsClientes = new Set(clientes.map((c) => normalizarEmail(c.email)).filter(Boolean));
  const idsClientes = new Set(clientes.map((c) => c.id));
  const emailsBajas = new Set(bajas.map((b) => normalizarEmail(b.email)));

  const vistos = new Set<string>();
  const destinatarios: Destinatario[] = [];
  let excluidosClientes = 0;
  let excluidosBajas = 0;

  // Las visitas vienen de la más nueva a la más vieja: el nombre que queda es el último que usó.
  for (const v of visitas) {
    const email = normalizarEmail(v.email);
    if (!EMAIL_VALIDO.test(email) || vistos.has(email)) continue;
    vistos.add(email);
    if (emailsClientes.has(email) || (v.lead_id && idsClientes.has(v.lead_id))) {
      excluidosClientes++;
      continue;
    }
    if (emailsBajas.has(email)) {
      excluidosBajas++;
      continue;
    }
    destinatarios.push({ email, nombre: (v.nombre ?? "").trim() });
  }

  return { destinatarios, excluidosClientes, excluidosBajas, faltaTablaBajas };
}

// ─── Link de baja ────────────────────────────────────────────────────────────

function secreto() {
  return process.env.NEWSLETTER_SECRET ?? process.env.REPROGRAMACION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "matulotes-dev";
}

function firmar(email: string) {
  return crypto.createHmac("sha256", secreto()).update(`baja:${email}`).digest("base64url").slice(0, 24);
}

/** Token del link de baja: `<email en base64url>.<firma>`. */
export function tokenBaja(email: string) {
  const e = normalizarEmail(email);
  return `${Buffer.from(e).toString("base64url")}.${firmar(e)}`;
}

/** Devuelve el email si el token de baja es válido, o null. */
export function verificarTokenBaja(token: string): string | null {
  const [b64, firma] = (token ?? "").split(".");
  if (!b64 || !firma) return null;
  let email: string;
  try {
    email = Buffer.from(b64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const esperada = firmar(email);
  if (firma.length !== esperada.length) return null;
  return crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada)) ? email : null;
}

export const linkBaja = (email: string) => `${SITE_URL}/newsletter/baja?t=${tokenBaja(email)}`;
export const linkBajaUnClic = (email: string) => `${SITE_URL}/api/newsletter/baja?t=${tokenBaja(email)}`;

// ─── Contenido del mail ──────────────────────────────────────────────────────

export type ContenidoNewsletter = {
  asunto: string;
  titulo: string;
  texto: string;
  imagenUrl: string;
  linkUrl: string;
  textoBoton: string;
};

/** Agrega al link los parámetros UTM, para medir en la web (y en el píxel de
 * Meta) quién llegó desde cada newsletter. */
export function linkConUtm(link: string, asunto: string) {
  const url = new URL(link, SITE_URL);
  const campania =
    asunto
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 50) || "newsletter";
  url.searchParams.set("utm_source", "newsletter");
  url.searchParams.set("utm_medium", "email");
  url.searchParams.set("utm_campaign", campania);
  return url.toString();
}

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Imagen optimizada para mail (Cloudinary): 1200 px de ancho, comprimida. */
function imagenParaMail(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/") && !url.includes("/upload/w_")
    ? url.replace("/upload/", "/upload/w_1200,q_auto,f_jpg/")
    : url;
}

/** HTML del newsletter para un destinatario (saludo con su nombre y su link de baja). */
export function armarHtmlNewsletter(c: ContenidoNewsletter, d: { nombre: string; email: string }) {
  const link = escapar(linkConUtm(c.linkUrl, c.asunto));
  const primerNombre = d.nombre.split(/\s+/)[0] ?? "";
  const saludo = primerNombre ? `Hola ${escapar(primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1).toLowerCase())},` : "Hola,";
  const parrafos = c.texto
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin: 0 0 14px; color: #333; font-size: 16px; line-height: 1.55;">${escapar(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

  return `
  <div style="background: #f4f4f1; padding: 24px 12px; font-family: Arial, Helvetica, sans-serif;">
    <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden;">
      <div style="padding: 18px 24px; background: #0f1f17; color: #ffffff;">
        <span style="font-weight: bold; letter-spacing: 1px;">MATULOTES</span>
        <span style="color: #d4b46a; font-size: 12px;"> · De Nunzio Negocios Inmobiliarios</span>
      </div>
      ${
        c.imagenUrl
          ? `<a href="${link}" target="_blank" style="display: block;"><img src="${escapar(imagenParaMail(c.imagenUrl))}" alt="${escapar(c.titulo || c.asunto)}" width="600" style="display: block; width: 100%; max-width: 600px; height: auto; border: 0;"></a>`
          : ""
      }
      <div style="padding: 24px;">
        <p style="margin: 0 0 12px; color: #333; font-size: 16px;">${saludo}</p>
        ${c.titulo ? `<h1 style="margin: 0 0 14px; color: #154a2e; font-size: 22px; line-height: 1.3;">${escapar(c.titulo)}</h1>` : ""}
        ${parrafos}
        <div style="text-align: center; margin: 24px 0 8px;">
          <a href="${link}" target="_blank" style="display: inline-block; background: #08743e; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 16px; padding: 14px 28px; border-radius: 999px;">${escapar(c.textoBoton || "Ver más")}</a>
        </div>
      </div>
    </div>
    <p style="max-width: 600px; margin: 16px auto 0; text-align: center; color: #888; font-size: 12px; line-height: 1.5;">
      Recibís este correo porque agendaste una visita en matulotes.app.<br>
      Si no querés recibir más promociones, <a href="${escapar(linkBaja(d.email))}" style="color: #888;">date de baja acá</a>.
    </p>
  </div>`;
}
