"use server";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual, requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { responderEnPrivado, responderEnPublico } from "@/lib/comentarios";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type Comentario = {
  id: string;
  creadoEn: string;
  red: "facebook" | "instagram";
  autor: string;
  texto: string;
  postLink: string | null;
  postTexto: string | null;
  atendido: boolean;
  respuesta: string | null;
  respuestaPrivada: boolean | null;
  respondidoEn: string | null;
  error: string | null;
};

const ROLES = ["administrador", "supervisor", "vendedor"] as const;

export async function getComentarios(): Promise<{ comentarios: Comentario[]; faltaTabla: boolean }> {
  const perfil = await getPerfilActual();
  if (!perfil || !ROLES.includes(perfil.rol as (typeof ROLES)[number])) return { comentarios: [], faltaTabla: false };
  const admin = (await getSupabaseAdminClient())!;
  const { data, error } = await admin.from("comentarios").select("*").order("creado_en", { ascending: false }).limit(300);
  if (error) return { comentarios: [], faltaTabla: /comentarios|does not exist|schema cache/i.test(error.message) };
  return {
    comentarios: (data ?? []).map((c) => ({
      id: c.id as string,
      creadoEn: c.creado_en as string,
      red: c.red as "facebook" | "instagram",
      autor: (c.autor_nombre as string) || "Usuario",
      texto: (c.texto as string) ?? "",
      postLink: (c.post_link as string) ?? null,
      postTexto: (c.post_texto as string) ?? null,
      atendido: !!c.atendido,
      respuesta: (c.respuesta as string) ?? null,
      respuestaPrivada: (c.respuesta_privada as boolean) ?? null,
      respondidoEn: (c.respondido_en as string) ?? null,
      error: (c.error as string) ?? null,
    })),
    faltaTabla: false,
  };
}

export async function responderComentarioAction(id: string, texto: string, privado: boolean): Promise<Resultado> {
  try {
    const perfil = await requireRole(...ROLES);
    const limpio = texto.trim().slice(0, 2000);
    if (!limpio) throw new AdminActionError("Escribí la respuesta.");
    const admin = (await getSupabaseAdminClient())!;
    const { data: c } = await admin.from("comentarios").select("red, comentario_id").eq("id", id).maybeSingle();
    if (!c) throw new AdminActionError("No encontré el comentario.");
    const r = privado
      ? await responderEnPrivado(c.comentario_id as string, limpio)
      : await responderEnPublico(c.red as "facebook" | "instagram", c.comentario_id as string, limpio);
    if (!r.ok) {
      await admin.from("comentarios").update({ error: r.error.slice(0, 500) }).eq("id", id);
      throw new AdminActionError(r.error);
    }
    await admin
      .from("comentarios")
      .update({ atendido: true, respuesta: limpio, respuesta_privada: privado, respondido_en: new Date().toISOString(), respondido_por: perfil.id, error: null })
      .eq("id", id);
    await registrarActividad(perfil, privado ? "responder_privado" : "responder_comentario", "comentario", id, {});
    return { ok: true };
  } catch (err) {
    if (err instanceof AdminActionError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "No se pudo responder." };
  }
}

export async function marcarComentarioAction(id: string, atendido: boolean): Promise<Resultado> {
  try {
    await requireRole(...ROLES);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("comentarios").update({ atendido }).eq("id", id);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error." };
  }
}

export async function contarComentariosPendientes(): Promise<number> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return 0;
  const { count } = await admin.from("comentarios").select("id", { count: "exact", head: true }).eq("atendido", false);
  return count ?? 0;
}
