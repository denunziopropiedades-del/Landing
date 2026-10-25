import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { verificarTokenBaja } from "@/lib/newsletter";

/** Registra la baja del newsletter para el email del token. Devuelve el email, o null si el token no sirve. */
export async function registrarBajaNewsletter(token: string): Promise<string | null> {
  const email = verificarTokenBaja(token);
  if (!email) return null;
  const admin = await getSupabaseAdminClient();
  if (!admin) return email;
  const { error } = await admin.from("newsletter_bajas").upsert({ email }, { onConflict: "email" });
  if (error) throw new Error(error.message);
  return email;
}
