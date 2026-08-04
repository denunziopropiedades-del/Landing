import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export class AdminActionError extends Error {}

/** Verifica que haya una sesión de Supabase activa antes de ejecutar una acción de escritura del panel admin. */
export async function requireAdminSession() {
  if (!isSupabaseConfigured()) {
    throw new AdminActionError(
      "Supabase no está configurado. Definí NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY para poder guardar cambios."
    );
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase!.auth.getUser();

  if (!user) {
    throw new AdminActionError("Tu sesión expiró. Volvé a iniciar sesión.");
  }

  return user;
}
