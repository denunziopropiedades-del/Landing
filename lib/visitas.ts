import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { HORARIOS_VISITA, horariosBloqueadosPorEscribania } from "@/lib/agenda";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

/** Clave para firmar los links de reprogramación (sin columna nueva en la base). */
function secretoReprogramacion() {
  return process.env.REPROGRAMACION_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "matulotes-dev";
}

function firmar(visitaId: string) {
  return crypto.createHmac("sha256", secretoReprogramacion()).update(`reprogramar:${visitaId}`).digest("base64url").slice(0, 32);
}

/** Token del link de reprogramación: `<id de la visita>.<firma>`. */
export function tokenReprogramacion(visitaId: string) {
  return `${visitaId}.${firmar(visitaId)}`;
}

/** Devuelve el id de la visita si el token es válido, o null. */
export function verificarTokenReprogramacion(token: string): string | null {
  const [id, firma] = decodeURIComponent(token).split(".");
  if (!id || !firma) return null;
  const esperada = firmar(id);
  if (firma.length !== esperada.length) return null;
  return crypto.timingSafeEqual(Buffer.from(firma), Buffer.from(esperada)) ? id : null;
}

export function linkReprogramacion(visitaId: string) {
  return `${SITE_URL}/visita/reprogramar/${tokenReprogramacion(visitaId)}`;
}

/** Bloque HTML para los mails al cliente con el botón para reprogramar la visita. */
export function bloqueReprogramarHtml(visitaId: string) {
  const url = linkReprogramacion(visitaId);
  return `
  <div style="margin: 20px 0; padding: 16px; border: 1px solid #d1d5db; border-radius: 8px; background: #f9fafb;">
    <p style="margin: 0 0 10px; color: #333;"><b>¿Te surgió un inconveniente ese día?</b> Podés elegir otro día y horario desde este link:</p>
    <a href="${url}" target="_blank" rel="noopener noreferrer"
       style="display: inline-block; padding: 10px 18px; border-radius: 999px; background: #08743E; color: #fff; font-weight: 600; text-decoration: none;">
      Reprogramar mi visita
    </a>
    <p style="margin: 10px 0 0; font-size: 12px; color: #666;">Si el link no abre, copiá esta dirección: ${url}</p>
  </div>`;
}

/** Horarios de las firmas de escribanía agendadas para una fecha. */
export async function horariosFirmasDelDia(supabase: SupabaseClient, fecha: string): Promise<string[]> {
  const { data } = await supabase
    .from("leads")
    .select("horario_firma_escribania")
    .eq("fecha_firma_escribania", fecha)
    .neq("estado", "descartado")
    .not("horario_firma_escribania", "is", null);
  return (data ?? []).map((l) => (l.horario_firma_escribania as string) ?? "").filter(Boolean);
}

/**
 * Turnos no disponibles para visitas en una fecha: los ya reservados por otra
 * visita activa más los bloqueados por firmas de escribanía (que tienen prioridad).
 */
export async function horariosNoDisponibles(
  supabase: SupabaseClient,
  fecha: string,
  excluirVisitaId?: string
): Promise<string[]> {
  let consulta = supabase.from("visitas").select("id, horario").eq("fecha", fecha).neq("estado", "cancelada");
  if (excluirVisitaId) consulta = consulta.neq("id", excluirVisitaId);

  const [{ data: visitas }, firmas] = await Promise.all([consulta, horariosFirmasDelDia(supabase, fecha)]);

  const ocupados = new Set<string>((visitas ?? []).map((v) => v.horario as string));
  for (const h of horariosBloqueadosPorEscribania(firmas)) ocupados.add(h);
  return [...ocupados];
}

/** Motivo por el que no se puede tomar un turno, o null si está libre. */
export async function motivoHorarioNoDisponible(
  supabase: SupabaseClient,
  fecha: string,
  horario: string,
  excluirVisitaId?: string
): Promise<string | null> {
  if (!HORARIOS_VISITA.includes(horario)) return "Ese horario no está disponible para visitas. Elegí otro horario.";

  const firmas = await horariosFirmasDelDia(supabase, fecha);
  if (horariosBloqueadosPorEscribania(firmas).includes(horario)) {
    return "Ese horario no está disponible por una firma en escribanía. Elegí otro horario.";
  }

  let consulta = supabase
    .from("visitas")
    .select("id")
    .eq("fecha", fecha)
    .eq("horario", horario)
    .neq("estado", "cancelada");
  if (excluirVisitaId) consulta = consulta.neq("id", excluirVisitaId);
  const { data } = await consulta.limit(1);
  if (data && data.length > 0) return "Ese horario ya fue reservado por otra persona. Elegí otro horario.";

  return null;
}
