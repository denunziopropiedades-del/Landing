import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizarTelefono } from "@/lib/leads";

/**
 * ¿Esta persona tiene bloqueado agendar visitas desde la web?
 * Se busca por mail (lo principal) y, como respaldo, por teléfono normalizado,
 * así no lo saltea cambiando una de las dos cosas.
 */
export async function agendaBloqueada(
  supabase: SupabaseClient,
  email: string | null | undefined,
  telefono: string | null | undefined
): Promise<boolean> {
  const mail = String(email ?? "").trim().toLowerCase();
  const tel = normalizarTelefono(telefono);
  const filtros = [mail ? `email.ilike.${mail.replace(/[,()]/g, "")}` : null, tel.length >= 8 ? `telefono_norm.eq.${tel}` : null].filter(
    Boolean
  ) as string[];
  if (!filtros.length) return false;
  const { data, error } = await supabase.from("agenda_bloqueos").select("id").or(filtros.join(",")).limit(1);
  if (error) return false; // tabla sin crear: no se bloquea a nadie
  return (data ?? []).length > 0;
}
