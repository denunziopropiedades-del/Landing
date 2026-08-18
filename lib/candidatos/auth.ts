import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class CandidatosActionError extends Error {}

export type AdminCandidatos = { id: string; email: string; nombre: string | null };

/**
 * Devuelve el administrador autenticado de este módulo (tabla propia
 * candidatos_administradores), o null si no hay sesión, Supabase no está
 * configurado, o el usuario no está habilitado acá.
 */
export async function getAdminCandidatosActual(): Promise<AdminCandidatos | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("candidatos_administradores")
    .select("id, email, nombre, activo")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data || !data.activo) return null;

  return { id: data.id, email: data.email, nombre: data.nombre };
}

/** Verifica sesión antes de una escritura; lanza un error apto para mostrar al usuario. */
export async function requireAdminCandidatos(): Promise<AdminCandidatos> {
  if (!isSupabaseConfigured()) {
    throw new CandidatosActionError(
      "Supabase no está configurado. Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  const admin = await getAdminCandidatosActual();
  if (!admin) {
    throw new CandidatosActionError("Tu sesión expiró o tu usuario no tiene acceso a este panel.");
  }

  return admin;
}
