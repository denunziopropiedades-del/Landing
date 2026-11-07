import type { SupabaseClient } from "@supabase/supabase-js";
import { guardarLeadUnificado } from "@/lib/leads";
import { guardarContactoDespues } from "@/lib/google-contactos";

/** Igual que guardarLeadUnificado, y además guarda al cliente en Google Contactos (si está conectado). */
export async function guardarLeadYContacto(...args: Parameters<typeof guardarLeadUnificado>) {
  const res = await guardarLeadUnificado(...args);
  if (res.id && !res.error) guardarContactoDespues(res.id);
  return res;
}

export type { SupabaseClient };
