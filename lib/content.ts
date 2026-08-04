import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  configFinanciacion as configFinanciacionSeed,
  galeria as galeriaSeed,
  lotes as lotesSeed,
  promocion as promocionSeed,
  siteTextos as siteTextosSeed,
  testimonios as testimoniosSeed,
} from "@/lib/data";
import type {
  ConfigFinanciacion,
  ItemGaleria,
  LoteTipo,
  Promocion,
  SiteTextos,
  Testimonio,
} from "@/types/site";

export type Novedad = {
  id: string;
  titulo: string;
  contenido: string;
  publicado: boolean;
  creadoEn: string;
};

/**
 * Capa de lectura de contenido público.
 *
 * Cada función intenta leer de Supabase; si no está configurado, la tabla
 * está vacía, o ocurre un error, se devuelve el contenido semilla de
 * lib/data.ts para que el sitio siempre se vea completo.
 */

export async function getLotes(): Promise<LoteTipo[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return lotesSeed;

  const { data, error } = await supabase.from("lotes").select("*").order("orden");
  if (error || !data || data.length === 0) return lotesSeed;

  return data.map((l) => ({
    id: l.id,
    nombre: l.nombre,
    superficieM2: Number(l.superficie_m2),
    dimensiones: l.dimensiones,
    precioUsd: Number(l.precio_usd),
    destacado: l.destacado,
    disponibles: l.disponibles,
  }));
}

export async function getPromocion(): Promise<Promocion> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return promocionSeed;

  const { data, error } = await supabase.from("promocion").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return promocionSeed;

  return {
    activa: data.activa,
    titulo: data.titulo,
    bajada: data.bajada,
    fechaFin: data.fecha_fin,
  };
}

export async function getFinanciacionConfig(): Promise<ConfigFinanciacion> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return configFinanciacionSeed;

  const { data, error } = await supabase.from("financiacion_config").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return configFinanciacionSeed;

  return {
    anticipoMinimoPct: Number(data.anticipo_minimo_pct),
    anticipoMaximoPct: Number(data.anticipo_maximo_pct),
    cuotasOpciones: data.cuotas_opciones,
    interesAnualPct: Number(data.interes_anual_pct),
  };
}

export async function getSiteTextos(): Promise<SiteTextos> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return siteTextosSeed;

  const { data, error } = await supabase.from("site_textos").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return siteTextosSeed;

  return {
    heroTitulo: data.hero_titulo,
    heroSubtitulo: data.hero_subtitulo,
    whatsappNumero: data.whatsapp_numero,
    whatsappMensajeDefault: data.whatsapp_mensaje_default,
    email: data.email,
    instagram: data.instagram ?? "",
    facebook: data.facebook ?? "",
    youtube: data.youtube ?? "",
  };
}

export async function getGaleria(): Promise<ItemGaleria[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return galeriaSeed;

  const { data, error } = await supabase.from("galeria").select("*").order("creado_en", { ascending: false });
  if (error || !data || data.length === 0) return galeriaSeed;

  return data.map((g) => ({
    id: g.id,
    categoria: g.categoria,
    url: g.url,
    titulo: g.titulo,
  }));
}

export async function getTestimonios(): Promise<Testimonio[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return testimoniosSeed;

  const { data, error } = await supabase.from("testimonios").select("*").order("creado_en", { ascending: false });
  if (error || !data || data.length === 0) return testimoniosSeed;

  return data.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    ubicacion: t.ubicacion ?? "",
    foto: t.foto ?? "",
    comentario: t.comentario,
    estrellas: t.estrellas,
  }));
}

export async function getNovedades(soloPublicadas = true): Promise<Novedad[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  let query = supabase.from("novedades").select("*").order("creado_en", { ascending: false });
  if (soloPublicadas) query = query.eq("publicado", true);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    contenido: n.contenido,
    publicado: n.publicado,
    creadoEn: n.creado_en,
  }));
}
