import { getSupabasePublicClient } from "@/lib/supabase/server";
import {
  bannersSeed,
  configFinanciacionSeed,
  faqsSeed,
  galeriaSeed,
  lotesSeed,
  progresoSeed,
  promocionesSeed,
  proyectoSeed,
  siteTextosSeed,
  testimoniosSeed,
} from "@/lib/data";
import type {
  Banner,
  ConfigFinanciacion,
  FaqItem,
  ItemGaleria,
  Lote,
  LoteTipo,
  ProgresoItem,
  Promocion,
  Proyecto,
  SiteTextos,
  Testimonio,
} from "@/types/site";

export type Novedad = {
  id: string;
  proyectoId: string | null;
  titulo: string;
  contenido: string;
  publicado: boolean;
  creadoEn: string;
};

/**
 * Capa de lectura de contenido público, multi-proyecto.
 *
 * Cada función intenta leer de Supabase; si no está configurado o la tabla
 * está vacía, se devuelve el contenido semilla del proyecto insignia
 * (lib/data.ts) para que la plataforma se vea completa en desarrollo.
 */

function mapProyecto(p: Record<string, unknown>): Proyecto {
  return {
    id: p.id as string,
    nombre: p.nombre as string,
    slug: p.slug as string,
    descripcion: p.descripcion as string,
    ubicacion: p.ubicacion as string,
    ubicacionMapsUrl: (p.ubicacion_maps_url as string) ?? null,
    imagenPortada: (p.imagen_portada as string) ?? null,
    publicado: p.publicado as boolean,
    destacado: p.destacado as boolean,
    whatsappNumero: (p.whatsapp_numero as string) ?? null,
    orden: p.orden as number,
  };
}

export async function getProyectos(): Promise<Proyecto[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return [proyectoSeed];

  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("publicado", true)
    .order("orden");
  if (error || !data || data.length === 0) return [proyectoSeed];

  return data.map(mapProyecto);
}

export async function getProyectoBySlug(slug: string): Promise<Proyecto | null> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return proyectoSeed.slug === slug ? proyectoSeed : null;

  const { data, error } = await supabase.from("proyectos").select("*").eq("slug", slug).maybeSingle();
  if (error || !data) return proyectoSeed.slug === slug ? proyectoSeed : null;

  return mapProyecto(data);
}

export async function getProyectoDestacado(): Promise<Proyecto | null> {
  const proyectos = await getProyectos();
  return proyectos.find((p) => p.destacado) ?? proyectos[0] ?? null;
}

export async function getLotes(proyectoId: string): Promise<Lote[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return lotesSeed.filter((l) => l.proyectoId === proyectoId);

  const { data, error } = await supabase
    .from("lotes")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("orden");
  if (error || !data) return [];

  return data.map((l) => ({
    id: l.id,
    proyectoId: l.proyecto_id,
    nombre: l.nombre,
    manzana: l.manzana,
    numero: l.numero,
    superficieM2: Number(l.superficie_m2),
    dimensiones: l.dimensiones,
    precioUsd: Number(l.precio_usd),
    estado: l.estado,
    destacado: l.destacado,
    posX: l.pos_x === null ? null : Number(l.pos_x),
    posY: l.pos_y === null ? null : Number(l.pos_y),
    anticipoFinanciadoUsd: l.anticipo_financiado_usd === null ? null : Number(l.anticipo_financiado_usd),
    cuotasFinanciado: l.cuotas_financiado === null ? null : Number(l.cuotas_financiado),
    valorCuotaFinanciadoUsd: l.valor_cuota_financiado_usd === null ? null : Number(l.valor_cuota_financiado_usd),
  }));
}

/** Agrupa el inventario individual de lotes en tarjetas comerciales por tipología (nombre). */
export function agruparLotesPorTipo(lotes: Lote[]): LoteTipo[] {
  const grupos = new Map<string, Lote[]>();
  for (const lote of lotes) {
    const grupo = grupos.get(lote.nombre) ?? [];
    grupo.push(lote);
    grupos.set(lote.nombre, grupo);
  }

  return Array.from(grupos.entries())
    .map(([nombre, items]) => {
      const disponibles = items.filter((l) => l.estado === "disponible");
      const referencia = disponibles[0] ?? items[0];
      return {
        nombre,
        superficieM2: referencia.superficieM2,
        dimensiones: referencia.dimensiones,
        precioUsd: referencia.precioUsd,
        disponibles: disponibles.length,
        destacado: items.some((l) => l.destacado),
        anticipoFinanciadoUsd: referencia.anticipoFinanciadoUsd,
        cuotasFinanciado: referencia.cuotasFinanciado,
        valorCuotaFinanciadoUsd: referencia.valorCuotaFinanciadoUsd,
      };
    })
    .sort((a, b) => a.superficieM2 - b.superficieM2);
}

export async function getPromocionActiva(proyectoId: string): Promise<Promocion | null> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return promocionesSeed.find((p) => p.proyectoId === proyectoId && p.activa) ?? null;

  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("activa", true)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;

  return {
    id: data.id,
    proyectoId: data.proyecto_id,
    activa: data.activa,
    titulo: data.titulo,
    bajada: data.bajada,
    fechaFin: data.fecha_fin,
  };
}

export async function getFinanciacionConfig(proyectoId: string): Promise<ConfigFinanciacion> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return configFinanciacionSeed;

  const { data, error } = await supabase
    .from("financiacion_config")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .maybeSingle();
  if (error || !data) return configFinanciacionSeed;

  return {
    anticipoMinimoPct: Number(data.anticipo_minimo_pct),
    anticipoMaximoPct: Number(data.anticipo_maximo_pct),
    cuotasOpciones: data.cuotas_opciones,
    interesAnualPct: Number(data.interes_anual_pct),
  };
}

export async function getSiteTextos(): Promise<SiteTextos> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return siteTextosSeed;

  const { data, error } = await supabase.from("site_textos").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return siteTextosSeed;

  return {
    heroTitulo: data.hero_titulo,
    heroSubtitulo: data.hero_subtitulo,
    whatsappNumero: data.whatsapp_numero,
    whatsappMensajeDefault: data.whatsapp_mensaje_default,
    telefonoOficina: data.telefono_oficina ?? "",
    email: data.email,
    instagram: data.instagram ?? "",
    facebook: data.facebook ?? "",
    youtube: data.youtube ?? "",
  };
}

export async function getGaleria(proyectoId: string): Promise<ItemGaleria[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return galeriaSeed.filter((g) => g.proyectoId === proyectoId);

  const { data, error } = await supabase
    .from("galeria")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("orden");
  if (error || !data) return [];

  return data.map((g) => ({ id: g.id, proyectoId: g.proyecto_id, categoria: g.categoria, url: g.url, titulo: g.titulo }));
}

export async function getProgreso(proyectoId: string): Promise<ProgresoItem[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return progresoSeed.filter((p) => p.proyectoId === proyectoId);

  const { data, error } = await supabase
    .from("progreso_desarrollo")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("orden");
  if (error || !data) return [];

  return data.map((p) => ({ id: p.id, proyectoId: p.proyecto_id, etapa: p.etapa, porcentaje: Number(p.porcentaje) }));
}

export async function getTestimonios(proyectoId?: string): Promise<Testimonio[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return testimoniosSeed;

  const query = supabase.from("testimonios").select("*").order("orden");
  const { data, error } = proyectoId
    ? await query.or(`proyecto_id.eq.${proyectoId},proyecto_id.is.null`)
    : await query;
  if (error || !data || data.length === 0) return testimoniosSeed;

  return data.map((t) => ({
    id: t.id,
    proyectoId: t.proyecto_id,
    nombre: t.nombre,
    ubicacion: t.ubicacion ?? "",
    foto: t.foto ?? "",
    comentario: t.comentario,
    estrellas: t.estrellas,
  }));
}

export async function getFaqs(proyectoId?: string): Promise<FaqItem[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return faqsSeed;

  const query = supabase.from("faqs").select("*").order("orden");
  const { data, error } = proyectoId
    ? await query.or(`proyecto_id.eq.${proyectoId},proyecto_id.is.null`)
    : await query.is("proyecto_id", null);
  if (error || !data || data.length === 0) return faqsSeed;

  return data.map((f) => ({ id: f.id, proyectoId: f.proyecto_id, pregunta: f.pregunta, respuesta: f.respuesta }));
}

export async function getBanners(proyectoId?: string): Promise<Banner[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return bannersSeed;

  const query = supabase.from("banners").select("*").eq("activo", true);
  const { data, error } = proyectoId
    ? await query.or(`proyecto_id.eq.${proyectoId},proyecto_id.is.null`)
    : await query.is("proyecto_id", null);
  if (error || !data) return [];

  return data.map((b) => ({
    id: b.id,
    proyectoId: b.proyecto_id,
    titulo: b.titulo,
    imagenUrl: b.imagen_url,
    linkUrl: b.link_url,
    activo: b.activo,
  }));
}

export async function getNovedades(proyectoId?: string): Promise<Novedad[]> {
  const supabase = await getSupabasePublicClient();
  if (!supabase) return [];

  let query = supabase.from("novedades").select("*").eq("publicado", true).order("creado_en", { ascending: false });
  query = proyectoId ? query.or(`proyecto_id.eq.${proyectoId},proyecto_id.is.null`) : query.is("proyecto_id", null);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map((n) => ({
    id: n.id,
    proyectoId: n.proyecto_id,
    titulo: n.titulo,
    contenido: n.contenido,
    publicado: n.publicado,
    creadoEn: n.creado_en,
  }));
}
