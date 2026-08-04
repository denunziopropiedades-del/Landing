export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * El sitio funciona con contenido semilla (lib/data.ts) cuando Supabase no
 * está configurado, para que el proyecto ande "out of the box" en desarrollo.
 * En producción, cargar las variables de entorno habilita persistencia real
 * (leads, reservas, panel admin, etc).
 */
export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
