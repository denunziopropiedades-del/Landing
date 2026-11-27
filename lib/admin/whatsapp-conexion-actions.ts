"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requireRole, getPerfilActual, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { GRAPH, META_APP_ID } from "@/lib/mensajeria";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type NumeroConectado = {
  id: string;
  numero: string | null;
  nombre: string;
  conectadoEn: string | null;
  tokenVence: string | null;
  coexistencia: boolean | null;
  registrado: boolean;
};

/** Números de WhatsApp conectados desde el panel (para la tarjeta de conexión). */
export async function getNumerosConectados(): Promise<NumeroConectado[]> {
  const perfil = await getPerfilActual();
  if (!perfil || perfil.rol !== "administrador") return [];
  const admin = await getSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("mensajes_canales")
    .select("id, numero, nombre, conectado_en, token_vence, coexistencia, registrado_en")
    .eq("tipo", "whatsapp")
    .order("creado_en");
  if (error) return [];
  return (data ?? []).map((c) => ({
    id: c.id as string,
    numero: (c.numero as string) ?? null,
    nombre: (c.nombre as string) ?? "",
    conectadoEn: (c.conectado_en as string) ?? null,
    tokenVence: (c.token_vence as string) ?? null,
    coexistencia: (c.coexistencia as boolean | null) ?? null,
    registrado: !!c.registrado_en,
  }));
}

async function graph(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${GRAPH}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new AdminActionError(`Meta respondió: ${json.error?.message ?? res.statusText}`);
  return json;
}

/**
 * Termina la conexión de un número que ya usa la app WhatsApp Business (coexistencia):
 * cambia el código del alta por un token, suscribe la app a la cuenta de WhatsApp para
 * recibir los mensajes y guarda el número como canal de la bandeja.
 */
export async function conectarWhatsappAction(datos: {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  /** true si Meta avisó que se conectó la app WhatsApp Business del celular. */
  coexistencia?: boolean;
}): Promise<Resultado<{ numero: string; aviso?: string }>> {
  try {
    const perfil = await requireRole("administrador");
    const secret = process.env.META_APP_SECRET;
    if (!secret) throw new AdminActionError("Falta META_APP_SECRET en Vercel.");
    if (!/^\d+$/.test(datos.wabaId) || !/^\d+$/.test(datos.phoneNumberId) || !datos.code) {
      throw new AdminActionError("Meta no devolvió los datos del número. Probá de nuevo.");
    }

    // 1) Código → token de acceso del negocio
    const url = `${GRAPH}/oauth/access_token?client_id=${META_APP_ID}&client_secret=${encodeURIComponent(secret)}&code=${encodeURIComponent(datos.code)}`;
    const resTok = await fetch(url);
    const tok = (await resTok.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: { message?: string } };
    if (!resTok.ok || !tok.access_token) throw new AdminActionError(`No se pudo completar la conexión: ${tok.error?.message ?? "sin token"}`);
    const token = tok.access_token;

    // 2) Que los mensajes de esta cuenta lleguen a nuestro webhook
    await graph(`${datos.wabaId}/subscribed_apps`, token, { method: "POST" });

    // 3) Datos del número
    const info = (await graph(`${datos.phoneNumberId}?fields=display_phone_number,verified_name`, token)) as {
      display_phone_number?: string;
      verified_name?: string;
    };
    const numero = (info.display_phone_number ?? "").replace(/\D/g, "");

    const ahora = new Date();
    const vence = tok.expires_in ? new Date(ahora.getTime() + tok.expires_in * 1000) : new Date(ahora.getTime() + 60 * 86400000);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("mensajes_canales").upsert(
      {
        tipo: "whatsapp",
        external_id: datos.phoneNumberId,
        numero: numero || null,
        nombre: info.verified_name ?? "WhatsApp",
        waba_id: datos.wabaId,
        access_token: token,
        token_vence: vence.toISOString(),
        conectado_en: ahora.toISOString(),
        coexistencia: datos.coexistencia ?? null,
        activo: true,
      },
      { onConflict: "external_id" }
    );
    if (error) throw error;

    // 4) Un número nuevo (no el de la app del celular) hay que darlo de alta en WhatsApp.
    let aviso: string | undefined;
    if (!datos.coexistencia) {
      const r = await registrarNumero(datos.phoneNumberId, token);
      if (!r.ok) aviso = r.error;
    }

    await registrarActividad(perfil, "conectar_whatsapp", "mensajes_canal", datos.phoneNumberId, { numero });
    revalidatePath("/admin/mensajes");
    return { ok: true, numero, aviso };
  } catch (err) {
    if (err instanceof AdminActionError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado al conectar el número." };
  }
}

/** Da de alta el número en WhatsApp (register) con un PIN de verificación en dos pasos. */
async function registrarNumero(phoneNumberId: string, token: string): Promise<Resultado> {
  const admin = (await getSupabaseAdminClient())!;
  const { data: canal } = await admin.from("mensajes_canales").select("pin").eq("external_id", phoneNumberId).maybeSingle();
  let pin = (canal?.pin as string | null) ?? null;
  if (!pin) {
    pin = String(Math.floor(100000 + Math.random() * 900000));
    await admin.from("mensajes_canales").update({ pin }).eq("external_id", phoneNumberId);
  }
  try {
    await graph(`${phoneNumberId}/register`, token, {
      method: "POST",
      body: JSON.stringify({ messaging_product: "whatsapp", pin }),
    });
    await admin.from("mensajes_canales").update({ registrado_en: new Date().toISOString() }).eq("external_id", phoneNumberId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Meta no aceptó el alta del número." };
  }
}

export type EstadoNumero = {
  status?: string;
  verificacion?: string;
  calidad?: string;
  nombreAprobado?: string;
  plataforma?: string;
};

/** Consulta en Meta el estado del número y, si hace falta, lo activa. */
export async function activarNumeroAction(canalId: string): Promise<Resultado<{ estado: EstadoNumero; activado: boolean }>> {
  try {
    const perfil = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { data: canal, error } = await admin
      .from("mensajes_canales")
      .select("external_id, access_token, coexistencia")
      .eq("id", canalId)
      .maybeSingle();
    if (error) throw error;
    if (!canal) throw new AdminActionError("No encontré ese número.");
    const token = (canal.access_token as string | null) ?? process.env.WHATSAPP_TOKEN;
    if (!token) throw new AdminActionError("El número no tiene token guardado. Volvé a conectarlo.");
    const pid = canal.external_id as string;

    const leer = async () =>
      (await graph(
        `${pid}?fields=status,code_verification_status,quality_rating,name_status,platform_type,display_phone_number`,
        token
      )) as { status?: string; code_verification_status?: string; quality_rating?: string; name_status?: string; platform_type?: string };

    let info = await leer();
    let activado = false;
    const yaActivo = info.status === "CONNECTED" || info.platform_type === "CLOUD_API";
    if (!yaActivo && canal.coexistencia !== true) {
      const r = await registrarNumero(pid, token);
      if (!r.ok) throw new AdminActionError(r.error);
      activado = true;
      info = await leer();
    } else if (yaActivo) {
      await admin.from("mensajes_canales").update({ registrado_en: new Date().toISOString() }).eq("id", canalId).is("registrado_en", null);
    }
    if (activado) await registrarActividad(perfil, "activar_whatsapp", "mensajes_canal", pid, {});
    revalidatePath("/admin/mensajes");
    return {
      ok: true,
      activado,
      estado: {
        status: info.status,
        verificacion: info.code_verification_status,
        calidad: info.quality_rating,
        nombreAprobado: info.name_status,
        plataforma: info.platform_type,
      },
    };
  } catch (err) {
    if (err instanceof AdminActionError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Error al consultar el número." };
  }
}

/**
 * Guarda un token de acceso para un número (por ejemplo el número de prueba de Meta,
 * que no se conecta con el botón). Antes de guardarlo comprueba que sirva para ese número.
 */
export async function guardarTokenCanalAction(canalId: string, token: string): Promise<Resultado<{ numero: string }>> {
  try {
    const perfil = await requireRole("administrador");
    const limpio = token.trim();
    if (!/^EA[A-Za-z0-9]{40,}$/.test(limpio)) throw new AdminActionError("Eso no parece un token de Meta (empieza con EAA…).");
    const admin = (await getSupabaseAdminClient())!;
    const { data: canal, error } = await admin.from("mensajes_canales").select("external_id").eq("id", canalId).eq("tipo", "whatsapp").maybeSingle();
    if (error) throw error;
    if (!canal) throw new AdminActionError("No encontré ese número.");
    const pid = canal.external_id as string;
    const info = (await graph(`${pid}?fields=display_phone_number,verified_name`, limpio)) as { display_phone_number?: string; verified_name?: string };
    const numero = (info.display_phone_number ?? "").replace(/\D/g, "");
    const { error: e2 } = await admin
      .from("mensajes_canales")
      .update({
        access_token: limpio,
        token_vence: null,
        numero: numero || undefined,
        conectado_en: new Date().toISOString(),
      })
      .eq("id", canalId);
    if (e2) throw e2;
    await registrarActividad(perfil, "token_whatsapp", "mensajes_canal", pid, { numero });
    revalidatePath("/admin/mensajes");
    return { ok: true, numero };
  } catch (err) {
    if (err instanceof AdminActionError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "No se pudo guardar el token." };
  }
}
