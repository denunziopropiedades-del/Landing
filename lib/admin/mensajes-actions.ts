"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual, requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { dentroDeVentana, enviarMessenger, enviarWhatsapp } from "@/lib/mensajeria";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  if (err instanceof Error && err.message) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

export type CanalBandeja = { id: string; tipo: "whatsapp" | "messenger" | "instagram"; nombre: string; numero: string | null };

export type ConversacionResumen = {
  id: string;
  canal: CanalBandeja;
  nombre: string;
  telefono: string | null;
  leadId: string | null;
  leadEstado: string | null;
  etiqueta: string | null;
  ultimoTexto: string;
  ultimoMensajeEn: string | null;
  ultimoEntranteEn: string | null;
  noLeidos: number;
  archivada: boolean;
};

export type MensajeBandeja = {
  id: string;
  direccion: "entrante" | "saliente";
  tipo: string;
  texto: string;
  mediaId: string | null;
  mediaUrl: string | null;
  estado: string;
  error: string | null;
  creadoEn: string;
  enviadoDesde: string | null;
  enviadoPor: string | null;
};

export type FichaLead = {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  estado: string;
  origen: string | null;
  utmCampaign: string | null;
  proyecto: string | null;
  asignado: string | null;
  observaciones: string;
  creadoEn: string;
};

export type RespuestaRapida = { id: string; titulo: string; texto: string };

const ROLES = ["administrador", "supervisor", "vendedor", "revisor"] as const;

/** Canales de demostración (número de prueba de Meta): lo único que ve el usuario revisor. */
async function canalesDemo(admin: NonNullable<Awaited<ReturnType<typeof getSupabaseAdminClient>>>): Promise<string[]> {
  const { data } = await admin.from("mensajes_canales").select("id").eq("demo", true);
  return (data ?? []).map((c) => c.id as string);
}

/** Si el usuario es revisor, verifica que la conversación sea de un canal de demostración. */
async function verificarDemo(
  admin: NonNullable<Awaited<ReturnType<typeof getSupabaseAdminClient>>>,
  rol: string,
  conversacionId: string
) {
  if (rol !== "revisor") return;
  const demo = await canalesDemo(admin);
  const { data } = await admin.from("conversaciones").select("canal_id").eq("id", conversacionId).maybeSingle();
  if (!data || !demo.includes(data.canal_id as string)) throw new AdminActionError("No tenés acceso a esta conversación.");
}

async function staff() {
  const perfil = await getPerfilActual();
  if (!perfil || !ROLES.includes(perfil.rol as (typeof ROLES)[number])) return null;
  return perfil;
}

/** Lista de conversaciones (más recientes primero). faltaTabla = falta correr sql-mensajes.sql. */
export async function getBandeja(): Promise<{
  conversaciones: ConversacionResumen[];
  canales: CanalBandeja[];
  faltaTabla: boolean;
}> {
  const vacio = { conversaciones: [], canales: [], faltaTabla: false };
  const admin = await getSupabaseAdminClient();
  const perfil = await staff();
  if (!admin || !perfil) return vacio;
  const soloDemo = perfil.rol === "revisor" ? await canalesDemo(admin) : null;
  if (soloDemo && !soloDemo.length) return vacio;

  let qCanales = admin.from("mensajes_canales").select("id, tipo, nombre, numero").eq("activo", true).order("creado_en");
  let qConv = admin
    .from("conversaciones")
    .select(
      "id, nombre, telefono, lead_id, ultimo_texto, ultimo_mensaje_en, ultimo_entrante_en, no_leidos, archivada, canal:mensajes_canales!conversaciones_canal_id_fkey(id, tipo, nombre, numero), lead:leads!conversaciones_lead_id_fkey(estado, proyecto:proyectos!leads_proyecto_id_fkey(nombre))"
    )
    .order("ultimo_mensaje_en", { ascending: false, nullsFirst: false })
    .limit(300);
  if (soloDemo) {
    qCanales = qCanales.in("id", soloDemo);
    qConv = qConv.in("canal_id", soloDemo);
  }
  const [{ data: canales, error: errCanales }, { data, error }] = await Promise.all([qCanales, qConv]);
  if (errCanales || error) {
    const msg = (errCanales ?? error)!.message;
    return { ...vacio, faltaTabla: /mensajes_canales|conversaciones|does not exist|schema cache/i.test(msg) };
  }

  type Fila = {
    id: string;
    nombre: string;
    telefono: string | null;
    lead_id: string | null;
    ultimo_texto: string;
    ultimo_mensaje_en: string | null;
    ultimo_entrante_en: string | null;
    no_leidos: number;
    archivada: boolean;
    canal: CanalBandeja | CanalBandeja[] | null;
    lead: { estado: string; proyecto: { nombre: string } | { nombre: string }[] | null } | { estado: string; proyecto: unknown }[] | null;
  };
  const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);

  const conversaciones = ((data ?? []) as unknown as Fila[])
    .map((f) => {
      const canal = uno(f.canal);
      if (!canal) return null;
      const lead = uno(f.lead) as { estado: string; proyecto: { nombre: string } | { nombre: string }[] | null } | null;
      const proyecto = lead ? uno(lead.proyecto) : null;
      return {
        id: f.id,
        canal,
        nombre: f.nombre,
        telefono: f.telefono,
        leadId: f.lead_id,
        leadEstado: lead?.estado ?? null,
        etiqueta: proyecto?.nombre ?? null,
        ultimoTexto: f.ultimo_texto,
        ultimoMensajeEn: f.ultimo_mensaje_en,
        ultimoEntranteEn: f.ultimo_entrante_en,
        noLeidos: f.no_leidos,
        archivada: f.archivada,
      } satisfies ConversacionResumen;
    })
    .filter((x): x is ConversacionResumen => !!x);

  return { conversaciones, canales: (canales ?? []) as CanalBandeja[], faltaTabla: false };
}

/** Mensajes de una conversación + ficha del lead. Marca la conversación como leída. */
export type EstadoAsistenteConv = { pausado: boolean; borrador: string | null; atencion: string | null };

export async function getConversacion(
  id: string
): Promise<{ mensajes: MensajeBandeja[]; lead: FichaLead | null; asistente?: EstadoAsistenteConv | null }> {
  const admin = await getSupabaseAdminClient();
  const perfil = await staff();
  if (!admin || !perfil) return { mensajes: [], lead: null };
  try {
    await verificarDemo(admin, perfil.rol, id);
  } catch {
    return { mensajes: [], lead: null };
  }

  const [{ data: msgs }, { data: conv }] = await Promise.all([
    admin
      .from("mensajes")
      .select("id, direccion, tipo, texto, media_id, media_url, estado, error, creado_en, enviado_desde, perfil:perfiles!mensajes_enviado_por_fkey(nombre, email)")
      .eq("conversacion_id", id)
      .order("creado_en", { ascending: false })
      .limit(300),
    admin.from("conversaciones").select("lead_id, no_leidos, bot_pausado, borrador_ia, atencion").eq("id", id).maybeSingle(),
  ]);
  if (conv?.no_leidos) await admin.from("conversaciones").update({ no_leidos: 0 }).eq("id", id);

  type FilaMsg = {
    id: string;
    direccion: "entrante" | "saliente";
    tipo: string;
    texto: string;
    media_id: string | null;
    media_url: string | null;
    estado: string;
    error: string | null;
    creado_en: string;
    enviado_desde: string | null;
    perfil: { nombre: string | null; email: string } | { nombre: string | null; email: string }[] | null;
  };
  const mensajes = ((msgs ?? []) as unknown as FilaMsg[])
    .reverse()
    .map((m) => {
      const p = Array.isArray(m.perfil) ? m.perfil[0] : m.perfil;
      return {
        id: m.id,
        direccion: m.direccion,
        tipo: m.tipo,
        texto: m.texto,
        mediaId: m.media_id,
        mediaUrl: m.media_url,
        estado: m.estado,
        error: m.error,
        creadoEn: m.creado_en,
        enviadoDesde: m.enviado_desde,
        enviadoPor: p ? p.nombre || p.email : null,
      };
    });

  let lead: FichaLead | null = null;
  if (conv?.lead_id) {
    const { data: l } = await admin
      .from("leads")
      .select("id, nombre, apellido, telefono, email, estado, origen, utm_campaign, observaciones, creado_en, proyecto:proyectos!leads_proyecto_id_fkey(nombre), asignado:perfiles!leads_asignado_a_fkey(nombre, email)")
      .eq("id", conv.lead_id)
      .maybeSingle();
    if (l) {
      const uno = <T,>(v: T | T[] | null | undefined): T | null => (Array.isArray(v) ? v[0] ?? null : v ?? null);
      const proyecto = uno(l.proyecto as { nombre: string } | { nombre: string }[] | null);
      const asignado = uno(l.asignado as { nombre: string | null; email: string } | { nombre: string | null; email: string }[] | null);
      lead = {
        id: l.id as string,
        nombre: [l.nombre, l.apellido].filter(Boolean).join(" "),
        telefono: (l.telefono as string) ?? "",
        email: (l.email as string) ?? "",
        estado: l.estado as string,
        origen: (l.origen as string) ?? null,
        utmCampaign: (l.utm_campaign as string) ?? null,
        proyecto: proyecto?.nombre ?? null,
        asignado: asignado ? asignado.nombre || asignado.email : null,
        observaciones: ((l.observaciones as string) ?? "").slice(-1500),
        creadoEn: l.creado_en as string,
      };
    }
  }
  const asistente: EstadoAsistenteConv | null = conv
    ? {
        pausado: !!(conv as { bot_pausado?: boolean }).bot_pausado,
        borrador: (conv as { borrador_ia?: string | null }).borrador_ia ?? null,
        atencion: (conv as { atencion?: string | null }).atencion ?? null,
      }
    : null;
  return { mensajes, lead, asistente };
}

/** Responde desde el panel por el mismo canal (y número) por el que escribió el cliente. */
export async function enviarMensajeAction(conversacionId: string, texto: string): Promise<Resultado<{ mensaje: MensajeBandeja }>> {
  try {
    const perfil = await requireRole(...ROLES);
    const limpio = texto.trim().slice(0, 4000);
    if (!limpio) throw new AdminActionError("Escribí un mensaje.");
    const admin = (await getSupabaseAdminClient())!;
    await verificarDemo(admin, perfil.rol, conversacionId);

    const { data: conv, error } = await admin
      .from("conversaciones")
      .select("id, contacto_id, ultimo_entrante_en, lead_id, canal:mensajes_canales(tipo, external_id, access_token)")
      .eq("id", conversacionId)
      .maybeSingle();
    if (error || !conv) throw new AdminActionError("No encontré la conversación.");
    const canal = (Array.isArray(conv.canal) ? conv.canal[0] : conv.canal) as
      | { tipo: string; external_id: string; access_token: string | null }
      | null;
    if (!canal) throw new AdminActionError("La conversación no tiene un canal conectado.");

    if (!dentroDeVentana(conv.ultimo_entrante_en as string | null)) {
      throw new AdminActionError(
        "Pasaron más de 24 h desde el último mensaje del cliente: Meta solo deja responder dentro de ese plazo. Escribile desde el celular."
      );
    }

    const envio =
      canal.tipo === "whatsapp"
        ? await enviarWhatsapp(canal.external_id, conv.contacto_id as string, limpio, canal.access_token)
        : await enviarMessenger(conv.contacto_id as string, limpio);
    if (!envio.ok) throw new AdminActionError(envio.error);

    const ahora = new Date().toISOString();
    const fila = {
      conversacion_id: conv.id,
      direccion: "saliente",
      tipo: "text",
      texto: limpio,
      external_id: envio.externalId,
      estado: "enviado",
      enviado_por: perfil.id,
      enviado_desde: "panel",
      creado_en: ahora,
    };
    let { data: msg, error: errIns } = await admin.from("mensajes").insert(fila).select("id").single();
    if (errIns && /duplicate key/i.test(errIns.message) && envio.externalId) {
      // El eco de Meta llegó antes que esta respuesta: se marca como enviado desde el panel.
      ({ data: msg, error: errIns } = await admin
        .from("mensajes")
        .update({ enviado_por: perfil.id, enviado_desde: "panel" })
        .eq("external_id", envio.externalId)
        .select("id")
        .single());
    }
    if (errIns) throw errIns;

    await admin
      .from("conversaciones")
      .update({ ultimo_texto: limpio.slice(0, 300), ultimo_mensaje_en: ahora, actualizado_en: ahora, no_leidos: 0 })
      .eq("id", conv.id);

    // Primer contacto: la ficha pasa de "nuevo" a "contactado".
    if (conv.lead_id) {
      await admin.from("leads").update({ estado: "contactado", actualizado_en: ahora }).eq("id", conv.lead_id).eq("estado", "nuevo");
    }
    await registrarActividad(perfil, "enviar_mensaje", "conversacion", conv.id as string, { canal: canal.tipo });

    return {
      ok: true,
      mensaje: {
        id: msg!.id as string,
        direccion: "saliente",
        tipo: "text",
        texto: limpio,
        mediaId: null,
        mediaUrl: null,
        estado: "enviado",
        error: null,
        creadoEn: ahora,
        enviadoDesde: "panel",
        enviadoPor: perfil.nombre || perfil.email,
      },
    };
  } catch (err) {
    return fail(err);
  }
}

export async function archivarConversacionAction(id: string, archivada: boolean): Promise<Resultado> {
  try {
    const perfil = await requireRole(...ROLES);
    const admin = (await getSupabaseAdminClient())!;
    await verificarDemo(admin, perfil.rol, id);
    const { error } = await admin.from("conversaciones").update({ archivada, no_leidos: 0 }).eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function getRespuestasRapidas(): Promise<RespuestaRapida[]> {
  const admin = await getSupabaseAdminClient();
  if (!admin || !(await staff())) return [];
  const { data } = await admin.from("respuestas_rapidas").select("id, titulo, texto").order("orden").order("creado_en");
  return (data ?? []) as RespuestaRapida[];
}

export async function guardarRespuestaRapidaAction(titulo: string, texto: string): Promise<Resultado<{ respuesta: RespuestaRapida }>> {
  try {
    await requireRole("administrador", "supervisor");
    const t = titulo.trim().slice(0, 40);
    const x = texto.trim().slice(0, 2000);
    if (!t || !x) throw new AdminActionError("Completá el título y el texto.");
    const admin = (await getSupabaseAdminClient())!;
    const { data, error } = await admin.from("respuestas_rapidas").insert({ titulo: t, texto: x, orden: 100 }).select("id, titulo, texto").single();
    if (error) throw error;
    return { ok: true, respuesta: data as RespuestaRapida };
  } catch (err) {
    return fail(err);
  }
}

export async function borrarRespuestaRapidaAction(id: string): Promise<Resultado> {
  try {
    await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("respuestas_rapidas").delete().eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Cantidad de conversaciones con mensajes sin leer (para el menú del panel). */
export async function contarNoLeidos(): Promise<number> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return 0;
  const perfil = await getPerfilActual();
  let q = admin.from("conversaciones").select("id", { count: "exact", head: true }).gt("no_leidos", 0).eq("archivada", false);
  if (perfil?.rol === "revisor") q = q.in("canal_id", await canalesDemo(admin));
  const { count, error } = await q;
  return error ? 0 : count ?? 0;
}
