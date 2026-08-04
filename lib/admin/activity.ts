import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { Perfil } from "@/types/site";

/**
 * Registra una acción administrativa en actividad_log para auditoría.
 * Se inserta con la service role (la tabla no admite inserts desde el
 * cliente autenticado), por lo que solo debe llamarse después de validar
 * el permiso del actor con requireRole().
 */
export async function registrarActividad(
  actor: Perfil,
  accion: string,
  entidad: string,
  entidadId: string | null,
  detalle?: Record<string, unknown>
) {
  const admin = await getSupabaseAdminClient();
  if (!admin) return;

  await admin.from("actividad_log").insert({
    usuario_id: actor.id,
    usuario_email: actor.email,
    accion,
    entidad,
    entidad_id: entidadId,
    detalle: detalle ?? null,
  });
}
