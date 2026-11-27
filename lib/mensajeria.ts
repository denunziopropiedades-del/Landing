import type { SupabaseClient } from "@supabase/supabase-js";
import { guardarLeadYContacto } from "@/lib/leads-servidor";
import { normalizarTelefono, telefonoInternacional } from "@/lib/leads";

/**
 * Bandeja de mensajes: WhatsApp (Cloud API, con coexistencia) y Messenger (página de Facebook).
 * Todo pasa por las APIs oficiales de Meta.
 *
 * Variables de entorno:
 *   WHATSAPP_TOKEN          token permanente de un usuario del sistema del Business Manager
 *                           (permisos whatsapp_business_messaging y whatsapp_business_management)
 *   META_PAGE_ACCESS_TOKEN  token de la página (ya se usa para los leads de Meta Ads); necesita
 *                           además pages_messaging para responder por Messenger
 *   META_APP_SECRET         para validar la firma de los webhooks
 *   META_WEBHOOK_VERIFY_TOKEN
 */

export const GRAPH = "https://graph.facebook.com/v21.0";
/** App de Meta "MATULOTES CMR" y configuración de alta de WhatsApp (registro insertado). Son datos públicos. */
export const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || "1548430039854662";
export const WA_SIGNUP_CONFIG_ID = process.env.NEXT_PUBLIC_WA_SIGNUP_CONFIG_ID || "2038402450171092";
const VENTANA_MS = 24 * 60 * 60 * 1000;

export type TipoCanal = "whatsapp" | "messenger" | "instagram";

export type Entrante = {
  canal: { tipo: TipoCanal; externalId: string; numero?: string | null; nombre?: string | null };
  contactoId: string;
  nombre?: string | null;
  telefono?: string | null;
  direccion: "entrante" | "saliente";
  tipo: string;
  texto: string;
  mediaId?: string | null;
  mediaUrl?: string | null;
  externalId?: string | null;
  fecha?: Date;
  /** Solo para salientes que no salieron del panel (eco del celular / Business Suite). */
  enviadoDesde?: "panel" | "celular";
};

/** Texto que se muestra en la lista para mensajes que no son de texto. */
export function resumenTipo(tipo: string, texto?: string | null): string {
  if (texto && texto.trim()) return texto.trim();
  const m: Record<string, string> = {
    image: "📷 Foto",
    video: "🎥 Video",
    audio: "🎤 Audio",
    document: "📄 Documento",
    sticker: "Sticker",
    location: "📍 Ubicación",
    contacts: "👤 Contacto",
    file: "📄 Archivo",
  };
  return m[tipo] ?? "Mensaje";
}

async function canalId(supabase: SupabaseClient, c: Entrante["canal"]): Promise<string | null> {
  const { data } = await supabase.from("mensajes_canales").select("id, numero, nombre").eq("external_id", c.externalId).maybeSingle();
  if (data) {
    const cambios: Record<string, string> = {};
    if (c.numero && !data.numero) cambios.numero = c.numero;
    if (c.nombre && !data.nombre) cambios.nombre = c.nombre;
    if (Object.keys(cambios).length) await supabase.from("mensajes_canales").update(cambios).eq("id", data.id);
    return data.id as string;
  }
  const { data: nuevo, error } = await supabase
    .from("mensajes_canales")
    .upsert(
      {
        tipo: c.tipo,
        external_id: c.externalId,
        numero: c.numero ?? null,
        nombre: c.nombre ?? ({ messenger: "Messenger", instagram: "Instagram", whatsapp: "WhatsApp" } as const)[c.tipo],
      },
      { onConflict: "external_id" }
    )
    .select("id")
    .single();
  if (error) {
    console.error("mensajeria: no se pudo crear el canal", error);
    return null;
  }
  return nuevo.id as string;
}

/** Busca o crea la ficha del CRM para quien escribe por primera vez. */
async function vincularLead(
  supabase: SupabaseClient,
  conv: { id: string; lead_id: string | null },
  e: Entrante
): Promise<string | null> {
  if (conv.lead_id) return conv.lead_id;
  const tel = e.telefono ? normalizarTelefono(e.telefono) : "";

  if (tel.length >= 8) {
    const { data: previo } = await supabase
      .from("leads")
      .select("id")
      .eq("telefono_norm", tel)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (previo) return previo.id as string;
  }

  // Solo se crea ficha cuando escribe el cliente (no por un eco de una respuesta nuestra).
  if (e.direccion !== "entrante") return null;

  const canalTxt =
    e.canal.tipo === "whatsapp"
      ? `WhatsApp${e.canal.numero ? ` al ${e.canal.numero}` : ""}`
      : e.canal.tipo === "instagram"
        ? "Instagram (mensaje directo)"
        : "Messenger de la página de Facebook";
  const res = await guardarLeadYContacto(supabase, {
    tipo: "contacto",
    origen: e.canal.tipo,
    nombre:
      e.nombre?.trim() ||
      ({ whatsapp: "Consulta por WhatsApp", messenger: "Consulta por Messenger", instagram: "Consulta por Instagram" } as const)[e.canal.tipo],
    email: "",
    telefono: tel.length >= 8 ? telefonoInternacional(tel) : "",
    estado: "nuevo",
    mensaje: e.texto.slice(0, 1000),
    observaciones: `Escribió por ${canalTxt}.`,
  });
  if (res.error) console.error("mensajeria: no se pudo crear el lead", res.error);
  return res.id;
}

/** Guarda un mensaje (entrante o eco de una respuesta) y actualiza la conversación. */
export async function registrarMensaje(supabase: SupabaseClient, e: Entrante): Promise<void> {
  if (e.externalId) {
    const { data: dup } = await supabase.from("mensajes").select("id").eq("external_id", e.externalId).maybeSingle();
    if (dup) return; // Meta reintenta los webhooks: no duplicar
  }

  const cId = await canalId(supabase, e.canal);
  if (!cId) return;

  const fecha = e.fecha ?? new Date();
  let { data: conv } = await supabase
    .from("conversaciones")
    .select("id, lead_id, nombre, telefono, no_leidos")
    .eq("canal_id", cId)
    .eq("contacto_id", e.contactoId)
    .maybeSingle();

  if (!conv) {
    const { data: nueva, error } = await supabase
      .from("conversaciones")
      .upsert(
        { canal_id: cId, contacto_id: e.contactoId, nombre: e.nombre ?? "", telefono: e.telefono ?? null },
        { onConflict: "canal_id,contacto_id" }
      )
      .select("id, lead_id, nombre, telefono, no_leidos")
      .single();
    if (error) {
      console.error("mensajeria: no se pudo crear la conversación", error);
      return;
    }
    conv = nueva;
  }
  if (!conv) return;

  const { error: errMsg } = await supabase.from("mensajes").insert({
    conversacion_id: conv.id,
    direccion: e.direccion,
    tipo: e.tipo,
    texto: e.texto,
    media_id: e.mediaId ?? null,
    media_url: e.mediaUrl ?? null,
    external_id: e.externalId ?? null,
    estado: e.direccion === "entrante" ? "recibido" : "enviado",
    enviado_desde: e.direccion === "saliente" ? e.enviadoDesde ?? "celular" : null,
    creado_en: fecha.toISOString(),
  });
  if (errMsg) {
    if (!/duplicate key/i.test(errMsg.message)) console.error("mensajeria: no se pudo guardar el mensaje", errMsg);
    return;
  }

  const leadId = await vincularLead(supabase, conv as { id: string; lead_id: string | null }, e);
  const cambios: Record<string, unknown> = {
    ultimo_texto: resumenTipo(e.tipo, e.texto).slice(0, 300),
    ultimo_mensaje_en: fecha.toISOString(),
    actualizado_en: new Date().toISOString(),
    archivada: false,
  };
  if (leadId && !conv.lead_id) cambios.lead_id = leadId;
  if (e.nombre && !conv.nombre) cambios.nombre = e.nombre;
  if (e.telefono && !conv.telefono) cambios.telefono = e.telefono;
  if (e.direccion === "entrante") {
    cambios.ultimo_entrante_en = fecha.toISOString();
    cambios.no_leidos = (conv.no_leidos ?? 0) + 1;
  } else {
    // Si respondieron desde el celular, la conversación ya está atendida.
    cambios.no_leidos = 0;
  }
  await supabase.from("conversaciones").update(cambios).eq("id", conv.id);
}

/** Actualiza el estado de un mensaje enviado (entregado, leído, error) — WhatsApp. */
export async function actualizarEstado(
  supabase: SupabaseClient,
  externalId: string,
  estado: string,
  error?: string | null
): Promise<void> {
  const valido = ({ sent: "enviado", delivered: "entregado", read: "leido", failed: "error" } as Record<string, string>)[estado];
  if (!valido) return;
  const fila: Record<string, string> = { estado: valido };
  if (error) fila.error = error.slice(0, 500);
  await supabase.from("mensajes").update(fila).eq("external_id", externalId).eq("direccion", "saliente");
}

export function dentroDeVentana(ultimoEntrante: string | null | undefined): boolean {
  if (!ultimoEntrante) return false;
  return Date.now() - new Date(ultimoEntrante).getTime() < VENTANA_MS;
}

type EnvioResultado = { ok: true; externalId: string | null } | { ok: false; error: string };

function errorMeta(json: unknown, fallback: string): string {
  const e = (json as { error?: { message?: string; error_user_msg?: string; code?: number } })?.error;
  if (!e) return fallback;
  if (e.code === 131047 || e.code === 10) {
    return "Pasaron más de 24 h desde el último mensaje del cliente: Meta solo deja responder dentro de ese plazo. Escribile desde el celular.";
  }
  return e.error_user_msg || e.message || fallback;
}

export async function enviarWhatsapp(
  phoneNumberId: string,
  para: string,
  texto: string,
  tokenCanal?: string | null
): Promise<EnvioResultado> {
  const token = tokenCanal || process.env.WHATSAPP_TOKEN;
  if (!token) return { ok: false, error: "Este número no está conectado. Conectalo desde Mensajes → Conectar WhatsApp Business." };
  const intentar = async (to: string) => {
    const res = await fetch(`${GRAPH}/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "text",
        text: { body: texto, preview_url: true },
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { code?: number } };
    return { res, json };
  };

  let { res, json } = await intentar(para);
  // Argentina: WhatsApp informa el número como 549 + área + número, pero la lista de
  // números de prueba de Meta lo guarda como 54 + área + 15 + número. Si Meta dice
  // "no está en la lista permitida" (131030), probamos con ese formato.
  const d = para.replace(/\D/g, "");
  if (!res.ok && json.error?.code === 131030 && /^549\d{10}$/.test(d)) {
    const resto = d.slice(3);
    for (const largoArea of [2, 3, 4]) {
      const alt = `54${resto.slice(0, largoArea)}15${resto.slice(largoArea)}`;
      ({ res, json } = await intentar(alt));
      if (res.ok || json.error?.code !== 131030) break;
    }
  }
  if (!res.ok) return { ok: false, error: errorMeta(json, "WhatsApp rechazó el mensaje.") };
  return { ok: true, externalId: json.messages?.[0]?.id ?? null };
}

export async function enviarMessenger(psid: string, texto: string): Promise<EnvioResultado> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "Falta configurar META_PAGE_ACCESS_TOKEN en Vercel." };
  const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: psid }, messaging_type: "RESPONSE", message: { text: texto } }),
  });
  const json = (await res.json().catch(() => ({}))) as { message_id?: string };
  if (!res.ok) return { ok: false, error: errorMeta(json, "Messenger rechazó el mensaje.") };
  return { ok: true, externalId: json.message_id ?? null };
}

/** Nombre del usuario de Messenger (si la página tiene permiso para verlo). */
export async function nombreMessenger(psid: string): Promise<string | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${GRAPH}/${psid}?fields=first_name,last_name,name&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { name?: string; first_name?: string; last_name?: string };
    return j.name || [j.first_name, j.last_name].filter(Boolean).join(" ") || null;
  } catch {
    return null;
  }
}

/** Token para usar con la API de un número: el que guardó la conexión del panel, o WHATSAPP_TOKEN. */
export async function tokenDeCanal(supabase: SupabaseClient, canalId: string): Promise<string | null> {
  const { data } = await supabase.from("mensajes_canales").select("access_token").eq("id", canalId).maybeSingle();
  return (data?.access_token as string | null) || process.env.WHATSAPP_TOKEN || null;
}

/** Nombre de quien escribe por Instagram (nombre o @usuario), si la página tiene permiso para verlo. */
export async function nombreInstagram(igsid: string): Promise<string | null> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`${GRAPH}/${igsid}?fields=name,username&access_token=${encodeURIComponent(token)}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { name?: string; username?: string };
    return j.name || (j.username ? `@${j.username}` : null);
  } catch {
    return null;
  }
}
