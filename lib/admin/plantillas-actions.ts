"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual, requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { GRAPH, registrarMensaje } from "@/lib/mensajeria";

/**
 * Plantillas de WhatsApp (mensajes aprobados por Meta). Son las únicas que se pueden
 * mandar para iniciar una conversación o escribir pasadas las 24 h (seguimientos).
 * Usa WHATSAPP_TOKEN (usuario del sistema del Business Manager).
 */

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const BUSINESS_ID = process.env.META_BUSINESS_ID || "441102449096164";

export type NumeroWa = { id: string; numero: string; nombre: string };
export type CuentaWa = { id: string; nombre: string; numeros: NumeroWa[] };
export type Plantilla = {
  id: string;
  nombre: string;
  estado: string;
  categoria: string;
  idioma: string;
  cuerpo: string;
  pie: string;
  variables: number;
  motivoRechazo: string | null;
};

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: err instanceof Error ? err.message : "Error inesperado." };
}

async function meta<T = Record<string, unknown>>(path: string, init?: RequestInit, tokenPropio?: string | null): Promise<T> {
  const token = tokenPropio || process.env.WHATSAPP_TOKEN;
  if (!token) throw new AdminActionError("Falta cargar WHATSAPP_TOKEN en Vercel (token permanente del usuario del sistema).");
  const res = await fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; error_user_msg?: string } };
  if (!res.ok) throw new AdminActionError(json.error?.error_user_msg || json.error?.message || "Meta rechazó el pedido.");
  return json;
}

type CanalToken = { external_id: string; waba_id: string | null; access_token: string; demo: boolean | null };

/** Números conectados desde el panel que tienen su propio token (incluye el número de prueba de Meta). */
async function canalesConToken(): Promise<CanalToken[]> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("mensajes_canales")
    .select("external_id, waba_id, access_token, demo")
    .eq("tipo", "whatsapp")
    .not("access_token", "is", null);
  return (data ?? []) as CanalToken[];
}

/** Token a usar para una cuenta de WhatsApp: el del número conectado, o WHATSAPP_TOKEN. */
async function tokenDeWaba(wabaId: string): Promise<string | null> {
  const c = (await canalesConToken()).find((x) => x.waba_id === wabaId);
  return c?.access_token ?? null;
}

/** Token a usar para enviar desde un número. */
async function tokenDeNumero(phoneNumberId: string): Promise<string | null> {
  const c = (await canalesConToken()).find((x) => x.external_id === phoneNumberId);
  return c?.access_token ?? null;
}

const contarVariables = (t: string) => new Set([...t.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size;

async function puedeVer() {
  const p = await getPerfilActual();
  return !!p && ["administrador", "supervisor", "revisor"].includes(p.rol);
}

async function esRevisor() {
  return (await getPerfilActual())?.rol === "revisor";
}

/** El revisor solo puede operar sobre la cuenta y el número de demostración. */
async function verificarDemoWaba(wabaId: string) {
  if (!(await esRevisor())) return;
  const ok = (await canalesConToken()).some((c) => c.demo && c.waba_id === wabaId);
  if (!ok) throw new AdminActionError("No tenés acceso a esta cuenta.");
}
async function verificarDemoNumero(phoneNumberId: string) {
  if (!(await esRevisor())) return;
  const ok = (await canalesConToken()).some((c) => c.demo && c.external_id === phoneNumberId);
  if (!ok) throw new AdminActionError("No tenés acceso a este número.");
}

/** Identificadores de cuentas de WhatsApp conocidas (por si la API del negocio no las lista). */
const WABAS_CONOCIDAS = (process.env.WHATSAPP_WABA_IDS || "1406307224250365,1631901291821979,2521041188381315")
  .split(",")
  .map((x) => x.trim())
  .filter((x) => /^\d+$/.test(x));

type WabaApi = {
  id: string;
  name?: string;
  phone_numbers?: { data?: { id: string; display_phone_number?: string; verified_name?: string }[] };
};
const CAMPOS = "id,name,phone_numbers{id,display_phone_number,verified_name}";

/**
 * Cuentas de WhatsApp Business a las que tiene acceso el token, con sus números.
 * Busca las propias del negocio, las compartidas con él y, si no aparece ninguna,
 * las conocidas por identificador (las que tiene asignadas el usuario del sistema).
 */
export async function getCuentasWhatsapp(): Promise<{ cuentas: CuentaWa[]; error: string | null }> {
  if (!(await puedeVer())) return { cuentas: [], error: null };
  const encontradas = new Map<string, WabaApi>();
  let ultimoError: string | null = null;

  const revisor = await esRevisor();
  // Cuentas de los números conectados desde el panel, con su propio token.
  for (const c of (await canalesConToken()).filter((x) => !revisor || x.demo)) {
    if (!c.waba_id || encontradas.has(c.waba_id)) continue;
    try {
      const w = await meta<WabaApi>(`${c.waba_id}?fields=${CAMPOS}`, undefined, c.access_token);
      if (w?.id) encontradas.set(w.id, w);
    } catch (err) {
      ultimoError = fail(err).error;
    }
  }

  const conTokenGeneral = process.env.WHATSAPP_TOKEN && !revisor ? ["owned_whatsapp_business_accounts", "client_whatsapp_business_accounts"] : [];
  for (const edge of conTokenGeneral) {
    try {
      const r = await meta<{ data?: WabaApi[] }>(`${BUSINESS_ID}/${edge}?fields=${CAMPOS}&limit=50`);
      for (const c of r.data ?? []) encontradas.set(c.id, c);
    } catch (err) {
      ultimoError = fail(err).error;
    }
  }
  for (const id of process.env.WHATSAPP_TOKEN && !revisor ? WABAS_CONOCIDAS : []) {
    if (encontradas.has(id)) continue;
    try {
      const c = await meta<WabaApi>(`${id}?fields=${CAMPOS}`);
      if (c?.id) encontradas.set(c.id, c);
    } catch (err) {
      ultimoError = fail(err).error;
    }
  }

  const cuentas = [...encontradas.values()]
    .map((c) => ({
      id: c.id,
      nombre: c.name ?? "Cuenta de WhatsApp",
      numeros: (c.phone_numbers?.data ?? []).map((n) => ({
        id: n.id,
        numero: n.display_phone_number ?? "",
        nombre: n.verified_name ?? "",
      })),
    }))
    .sort((a, b) => b.numeros.length - a.numeros.length);
  return { cuentas, error: cuentas.length ? null : ultimoError };
}

export async function getPlantillas(wabaId: string): Promise<{ plantillas: Plantilla[]; error: string | null }> {
  if (!(await puedeVer())) return { plantillas: [], error: null };
  if (!/^\d+$/.test(wabaId)) return { plantillas: [], error: "Cuenta inválida." };
  try {
    await verificarDemoWaba(wabaId);
    type Comp = { type: string; text?: string };
    const r = await meta<{
      data?: { id: string; name: string; status: string; category: string; language: string; components?: Comp[]; rejected_reason?: string }[];
    }>(`${wabaId}/message_templates?fields=id,name,status,category,language,components,rejected_reason&limit=100`, undefined, await tokenDeWaba(wabaId));
    const plantillas = (r.data ?? []).map((p) => {
      const cuerpo = p.components?.find((c) => c.type === "BODY")?.text ?? "";
      return {
        id: p.id,
        nombre: p.name,
        estado: p.status,
        categoria: p.category,
        idioma: p.language,
        cuerpo,
        pie: p.components?.find((c) => c.type === "FOOTER")?.text ?? "",
        variables: contarVariables(cuerpo),
        motivoRechazo: p.rejected_reason && p.rejected_reason !== "NONE" ? p.rejected_reason : null,
      };
    });
    return { plantillas, error: null };
  } catch (err) {
    return { plantillas: [], error: fail(err).error };
  }
}

/** Crea una plantilla y la manda a aprobación de Meta. */
export async function crearPlantillaAction(datos: {
  wabaId: string;
  nombre: string;
  categoria: "MARKETING" | "UTILITY";
  idioma: string;
  cuerpo: string;
  ejemplos: string[];
  pie?: string;
}): Promise<Resultado<{ id: string; estado: string }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor", "revisor");
    await verificarDemoWaba(datos.wabaId);
    const nombre = datos.nombre
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 512);
    if (!nombre) throw new AdminActionError("Poné un nombre para la plantilla.");
    const cuerpo = datos.cuerpo.trim();
    if (!cuerpo) throw new AdminActionError("Escribí el texto del mensaje.");
    if (cuerpo.length > 1024) throw new AdminActionError("El texto no puede pasar de 1024 caracteres.");
    const n = contarVariables(cuerpo);
    const ejemplos = datos.ejemplos.slice(0, n).map((e) => e.trim());
    if (n && ejemplos.filter(Boolean).length < n) throw new AdminActionError("Completá un ejemplo para cada variable ({{1}}, {{2}}…).");

    const components: Record<string, unknown>[] = [
      { type: "BODY", text: cuerpo, ...(n ? { example: { body_text: [ejemplos] } } : {}) },
    ];
    if (datos.pie?.trim()) components.push({ type: "FOOTER", text: datos.pie.trim().slice(0, 60) });

    const r = await meta<{ id: string; status: string }>(`${datos.wabaId}/message_templates`, {
      method: "POST",
      body: JSON.stringify({ name: nombre, category: datos.categoria, language: datos.idioma || "es_AR", components }),
    }, await tokenDeWaba(datos.wabaId));
    await registrarActividad(perfil, "crear_plantilla_whatsapp", "plantilla", r.id, { nombre, categoria: datos.categoria });
    return { ok: true, id: r.id, estado: r.status };
  } catch (err) {
    return fail(err);
  }
}

function aWhatsapp(tel: string): string {
  let d = tel.replace(/\D/g, "");
  if (d.startsWith("549")) return d;
  if (d.startsWith("54")) return "549" + d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 && d.startsWith("15")) d = "11" + d.slice(2);
  if (d.length === 12 && d.slice(2, 4) === "15") d = d.slice(0, 2) + d.slice(4);
  return d.length === 10 ? "549" + d : d;
}

/** Envía una plantilla aprobada a un número (inicia la conversación) y la deja en la bandeja. */
export async function enviarPlantillaAction(datos: {
  phoneNumberId: string;
  numeroEmisor: string;
  para: string;
  plantilla: string;
  idioma: string;
  cuerpo: string;
  variables: string[];
}): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador", "supervisor", "vendedor", "revisor");
    await verificarDemoNumero(datos.phoneNumberId);
    const para = aWhatsapp(datos.para);
    if (para.length < 11) throw new AdminActionError("Revisá el número de destino.");
    const parametros = datos.variables.map((v) => ({ type: "text", text: v.trim() || "-" }));
    const r = await meta<{ messages?: { id: string }[] }>(`${datos.phoneNumberId}/messages`, {
      method: "POST",
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: para,
        type: "template",
        template: {
          name: datos.plantilla,
          language: { code: datos.idioma },
          ...(parametros.length ? { components: [{ type: "body", parameters: parametros }] } : {}),
        },
      }),
    }, await tokenDeNumero(datos.phoneNumberId));

    let texto = datos.cuerpo;
    datos.variables.forEach((v, i) => (texto = texto.split(`{{${i + 1}}}`).join(v)));
    const admin = await getSupabaseAdminClient();
    if (admin) {
      await registrarMensaje(admin, {
        canal: { tipo: "whatsapp", externalId: datos.phoneNumberId, numero: datos.numeroEmisor.replace(/\D/g, "") || null },
        contactoId: para,
        telefono: para,
        direccion: "saliente",
        tipo: "text",
        texto,
        externalId: r.messages?.[0]?.id ?? null,
        enviadoDesde: "panel",
      });
    }
    await registrarActividad(perfil, "enviar_plantilla_whatsapp", "plantilla", datos.plantilla, { para });
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
