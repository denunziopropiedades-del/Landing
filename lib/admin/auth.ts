import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Perfil, Rol } from "@/types/site";

export class AdminActionError extends Error {}

/**
 * Devuelve el perfil (con rol) del usuario autenticado actual, o null si no
 * hay sesión, Supabase no está configurado, o el usuario no tiene perfil
 * activo. Se apoya en la sesión propia del usuario (no en la service role),
 * por lo que respeta RLS de la tabla `perfiles`.
 */
export async function getPerfilActual(): Promise<Perfil | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await getSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.from("perfiles").select("*").eq("id", user.id).maybeSingle();
  if (error || !data || !data.activo) return null;

  return {
    id: data.id,
    email: data.email,
    nombre: data.nombre,
    rol: data.rol,
    activo: data.activo,
    creadoEn: data.creado_en,
  };
}

/**
 * Verifica que haya una sesión activa con uno de los roles permitidos antes
 * de ejecutar una acción de escritura del panel admin. Lanza AdminActionError
 * con un mensaje apto para mostrar al usuario si la verificación falla.
 */
export async function requireRole(...rolesPermitidos: Rol[]): Promise<Perfil> {
  if (!isSupabaseConfigured()) {
    throw new AdminActionError(
      "Supabase no está configurado. Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para poder guardar cambios."
    );
  }

  const perfil = await getPerfilActual();
  if (!perfil) {
    throw new AdminActionError("Tu sesión expiró o tu usuario no tiene un perfil activo. Volvé a iniciar sesión.");
  }

  if (!rolesPermitidos.includes(perfil.rol)) {
    throw new AdminActionError("No tenés permisos para realizar esta acción.");
  }

  return perfil;
}
