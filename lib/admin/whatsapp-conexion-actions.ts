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
};

/** Números de WhatsApp conectados desde el panel (para la tarjeta de conexión). */
export async function getNumerosConectados(): Promise<NumeroConectado[]> {
  const perfil = await getPerfilActual();
  if (!perfil || perfil.rol !== "administrador") return [];
  const admin = await getSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("mensajes_canales")
    .select("id, numero, nombre, conectado_en, token_vence")
    .eq("tipo", "whatsapp")
    .not("conectado_en", "is", null)
    .order("conectado_en");
  if (error) return [];
  return (data ?? []).map((c) => ({
    id: c.id as string,
    numero: (c.numero as string) ?? null,
    nombre: (c.nombre as string) ?? "",
    conectadoEn: (c.conectado_en as string) ?? null,
    tokenVence: (c.token_vence as string) ?? null,
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
}): Promise<Resultado<{ numero: string }>> {
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
        activo: true,
      },
      { onConflict: "external_id" }
    );
    if (error) throw error;

    await registrarActividad(perfil, "conectar_whatsapp", "mensajes_canal", datos.phoneNumberId, { numero });
    revalidatePath("/admin/mensajes");
    return { ok: true, numero };
  } catch (err) {
    if (err instanceof AdminActionError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: err instanceof Error ? err.message : "Error inesperado al conectar el número." };
  }
}
