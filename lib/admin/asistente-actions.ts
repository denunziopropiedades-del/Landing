"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { CONFIG_DEFECTO, generarRespuesta, leerConfig, type ConfigAsistente } from "@/lib/asistente/motor";
import { tokenGateway, type MensajeLLM } from "@/lib/asistente/llm";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: err instanceof Error ? err.message : "Error inesperado." };
}

export type CanalAsistente = { id: string; tipo: string; numero: string | null; nombre: string; demo: boolean };
export type LogAsistente = {
  id: string;
  creadoEn: string;
  tipo: string;
  salida: string | null;
  acciones: string[];
  error: string | null;
  contacto: string;
};

export async function getAsistenteDatos(): Promise<{
  config: ConfigAsistente;
  canales: CanalAsistente[];
  logs: LogAsistente[];
  tokensMes: number;
  faltaTabla: boolean;
}> {
  await requireRole("administrador");
  const admin = (await getSupabaseAdminClient())!;
  const desde = new Date(Date.now() - 30 * 86400000).toISOString();
  const [config, { data: canales }, { data: logs, error }, { data: uso }] = await Promise.all([
    leerConfig(admin),
    admin.from("mensajes_canales").select("id, tipo, numero, nombre, demo").eq("activo", true).order("creado_en"),
    admin
      .from("asistente_log")
      .select("id, creado_en, tipo, salida, acciones, error, conv:conversaciones(nombre, telefono)")
      .order("creado_en", { ascending: false })
      .limit(40),
    admin.from("asistente_log").select("tokens").gte("creado_en", desde).limit(5000),
  ]);
  return {
    config,
    canales: (canales ?? []).map((c) => ({
      id: c.id as string,
      tipo: (c.tipo as string) ?? "whatsapp",
      numero: (c.numero as string) ?? null,
      nombre: (c.nombre as string) ?? "",
      demo: !!c.demo,
    })),
    logs: (logs ?? []).map((l) => {
      const conv = (Array.isArray(l.conv) ? l.conv[0] : l.conv) as { nombre: string | null; telefono: string | null } | null;
      return {
        id: l.id as string,
        creadoEn: l.creado_en as string,
        tipo: (l.tipo as string) ?? "",
        salida: (l.salida as string) ?? null,
        acciones: Array.isArray(l.acciones) ? (l.acciones as string[]) : [],
        error: (l.error as string) ?? null,
        contacto: conv?.nombre || conv?.telefono || "",
      };
    }),
    tokensMes: (uso ?? []).reduce((a, r) => a + ((r.tokens as number) ?? 0), 0),
    faltaTabla: !!error && /asistente_log|does not exist|schema cache/i.test(error.message),
  };
}

export async function guardarConfigAsistenteAction(cfg: ConfigAsistente): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const fila = {
      id: 1,
      activo: !!cfg.activo,
      modo: cfg.modo === "automatico" ? "automatico" : "borrador",
      canales: (cfg.canales ?? []).filter((x) => /^[0-9a-f-]{36}$/i.test(x)),
      modelo: (cfg.modelo || CONFIG_DEFECTO.modelo).trim().slice(0, 80),
      nombre_asistente: (cfg.nombre_asistente || CONFIG_DEFECTO.nombre_asistente).trim().slice(0, 80),
      info_negocio: (cfg.info_negocio ?? "").slice(0, 6000),
      instrucciones: (cfg.instrucciones ?? "").slice(0, 4000),
      seguimiento_activo: !!cfg.seguimiento_activo,
      seguimiento_horas: Math.min(Math.max(Number(cfg.seguimiento_horas) || 48, 12), 24 * 30),
      seguimiento_max: Math.min(Math.max(Number(cfg.seguimiento_max) || 1, 1), 5),
      seguimiento_plantilla: (cfg.seguimiento_plantilla ?? "").trim().slice(0, 120),
      seguimiento_idioma: (cfg.seguimiento_idioma || "es_AR").trim().slice(0, 10),
      seguimiento_estados: (cfg.seguimiento_estados ?? []).slice(0, 12),
      comentarios_auto: !!cfg.comentarios_auto,
      actualizado_en: new Date().toISOString(),
    };
    if (fila.activo && !fila.canales.length) throw new AdminActionError("Elegí al menos un canal para que atienda el asistente.");
    const { error } = await admin.from("asistente_config").upsert(fila, { onConflict: "id" });
    if (error) throw error;
    await registrarActividad(perfil, "configurar", "asistente", "1", { activo: fila.activo, modo: fila.modo, canales: fila.canales.length });
    revalidatePath("/admin/asistente");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Prueba el asistente con una conversación inventada: no envía nada ni guarda datos. */
export async function probarAsistenteAction(
  cfg: ConfigAsistente,
  historial: { rol: "cliente" | "asistente"; texto: string }[]
): Promise<Resultado<{ texto: string; acciones: string[] }>> {
  try {
    await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const h = await headers();
    const token = tokenGateway(h.get("x-vercel-oidc-token"));
    if (!token) throw new AdminActionError("Falta la conexión con la IA (AI Gateway de Vercel).");
    const msgs: MensajeLLM[] = historial
      .filter((m) => m.texto.trim())
      .slice(-20)
      .map((m) => ({ role: m.rol === "cliente" ? "user" : "assistant", content: m.texto.trim().slice(0, 2000) }) as MensajeLLM);
    if (!msgs.length || msgs[msgs.length - 1].role !== "user") throw new AdminActionError("Escribí un mensaje como si fueras el cliente.");
    const r = await generarRespuesta({ supabase: admin, cfg: { ...CONFIG_DEFECTO, ...cfg }, token, historial: msgs, simulacion: true, telefono: "+5491100000000" });
    return { ok: true, texto: r.texto || "(sin respuesta)", acciones: r.acciones };
  } catch (err) {
    return fail(err);
  }
}

/** Pausa o reanuda el asistente en una conversación (lo puede hacer cualquier asesor). */
export async function pausarAsistenteAction(conversacionId: string, pausado: boolean): Promise<Resultado> {
  try {
    await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;
    const cambios: Record<string, unknown> = { bot_pausado: pausado };
    if (!pausado) cambios.atencion = null;
    const { error } = await admin.from("conversaciones").update(cambios).eq("id", conversacionId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function descartarBorradorAction(conversacionId: string): Promise<Resultado> {
  try {
    await requireRole("administrador", "supervisor", "vendedor", "revisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("conversaciones").update({ borrador_ia: null, borrador_en: null }).eq("id", conversacionId);
    if (error) throw error;
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
