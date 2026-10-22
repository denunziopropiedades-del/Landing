import { getSupabasePublicClient } from "@/lib/supabase/server";
import { getZona } from "@/lib/zonas";
import { esRural, mapPropiedad, type Operacion, type Propiedad, type TipoPropiedad } from "@/lib/propiedades-base";

export * from "@/lib/propiedades-base";

export type FiltrosPropiedades = {
  operacion?: Operacion;
  tipos?: TipoPropiedad[];
  zona?: string;
  partido?: string;
  ambientesMin?: number;
  hectareasMin?: number;
  destacadas?: boolean;
  limite?: number;
};

/**
 * Lee propiedades publicadas. Si Supabase no está configurado o la tabla todavía
 * no existe (falta correr sql-propiedades.sql), devuelve una lista vacía.
 */
export async function getPropiedades(filtros: FiltrosPropiedades = {}): Promise<Propiedad[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return [];

  let q = supabase.from("propiedades").select("*").eq("publicado", true);
  if (filtros.operacion) q = q.eq("operacion", filtros.operacion);
  if (filtros.tipos?.length) q = q.in("tipo", filtros.tipos);
  if (filtros.partido) q = q.eq("partido", filtros.partido);
  else if (filtros.zona) {
    const zona = getZona(filtros.zona);
    if (zona) q = q.in("partido", zona.partidos.map((p) => p.slug));
  }
  if (filtros.ambientesMin) q = q.gte("ambientes", filtros.ambientesMin);
  if (filtros.hectareasMin) q = q.gte("hectareas", filtros.hectareasMin);
  if (filtros.destacadas) q = q.eq("destacado", true);
  const ordenada = q.order("destacado", { ascending: false }).order("orden").order("creado_en", { ascending: false });
  const { data, error } = await (filtros.limite ? ordenada.limit(filtros.limite) : ordenada);
  if (error) {
    if (error.code !== "42P01" && error.code !== "PGRST205") console.error("Error leyendo propiedades", error.message);
    return [];
  }
  return (data ?? []).map(mapPropiedad);
}

export async function getPropiedadBySlug(slug: string): Promise<Propiedad | null> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return null;
  const { data } = await supabase.from("propiedades").select("*").eq("slug", slug).eq("publicado", true).maybeSingle();
  return data ? mapPropiedad(data) : null;
}

/** Cantidad de propiedades publicadas por partido y operación (para las tarjetas de zona). */
export async function getConteoPorPartido(): Promise<Record<string, { venta: number; alquiler: number; campos: number }>> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return {};
  const { data, error } = await supabase.from("propiedades").select("partido, operacion, tipo").eq("publicado", true);
  if (error || !data) return {};
  const conteo: Record<string, { venta: number; alquiler: number; campos: number }> = {};
  for (const p of data) {
    const c = (conteo[p.partido as string] ??= { venta: 0, alquiler: 0, campos: 0 });
    if (esRural(p.tipo as TipoPropiedad)) c.campos++;
    else if (p.operacion === "venta") c.venta++;
    else c.alquiler++;
  }
  return conteo;
}

