"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual, requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { ESTADOS_POSTULANTE, mapPostulante, type EstadoPostulante, type Postulante } from "@/lib/postulantes";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  if (err instanceof Error && err.message) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

/** Lista de postulantes (más nuevos primero). faltaTabla = todavía no se corrió sql-postulantes.sql. */
export async function getPostulantes(): Promise<{ postulantes: Postulante[]; faltaTabla: boolean }> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return { postulantes: [], faltaTabla: false };
  // Este archivo es "use server": cualquiera podría invocarlo, así que se valida el rol.
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return { postulantes: [], faltaTabla: false };
  const { data, error } = await admin.from("postulantes").select("*").order("creado_en", { ascending: false }).limit(1000);
  if (error) return { postulantes: [], faltaTabla: /postulantes/.test(error.message) };
  return { postulantes: (data ?? []).map(mapPostulante), faltaTabla: false };
}

export async function actualizarPostulanteAction(
  id: string,
  cambios: { estado?: EstadoPostulante; notas?: string }
): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const fila: Record<string, string> = {};
    if (cambios.estado) {
      if (!ESTADOS_POSTULANTE.some((e) => e.value === cambios.estado)) throw new AdminActionError("Estado inválido.");
      fila.estado = cambios.estado;
    }
    if (cambios.notas !== undefined) fila.notas = cambios.notas.slice(0, 4000);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("postulantes").update(fila).eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "actualizar", "postulante", id, fila);
    revalidatePath("/admin/postulantes");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Link temporal (10 min) para descargar el CV del bucket privado. */
export async function linkCvAction(id: string): Promise<Resultado<{ url: string }>> {
  try {
    await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { data: fila } = await admin.from("postulantes").select("cv_path, cv_nombre").eq("id", id).maybeSingle();
    if (!fila?.cv_path) throw new AdminActionError("Esta postulación no tiene CV.");
    const { data, error } = await admin.storage
      .from("cvs")
      .createSignedUrl(fila.cv_path, 600, { download: fila.cv_nombre || true });
    if (error || !data) throw new AdminActionError("No se pudo generar el link del CV.");
    return { ok: true, url: data.signedUrl };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarPostulanteAction(id: string): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { data: fila } = await admin.from("postulantes").select("nombre, cv_path").eq("id", id).maybeSingle();
    if (fila?.cv_path) await admin.storage.from("cvs").remove([fila.cv_path]);
    const { error } = await admin.from("postulantes").delete().eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "eliminar", "postulante", id, { nombre: fila?.nombre });
    revalidatePath("/admin/postulantes");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
