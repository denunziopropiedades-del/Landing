import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { ItemGaleria, Lead, LoteTipo, Testimonio } from "@/types/site";
import type { Novedad } from "@/lib/content";

/**
 * Getters "crudos" para el panel admin: a diferencia de lib/content.ts, NO
 * devuelven contenido semilla como fallback. Si Supabase no está configurado
 * o la tabla está vacía, devuelven [] para que el admin vea el estado real
 * de la base y no edite por error una fila semilla inexistente.
 */

export async function getLotesAdmin(): Promise<LoteTipo[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("lotes").select("*").order("orden");
  if (error || !data) return [];

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

export async function getGaleriaAdmin(): Promise<ItemGaleria[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("galeria").select("*").order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((g) => ({ id: g.id, categoria: g.categoria, url: g.url, titulo: g.titulo }));
}

export async function getTestimoniosAdmin(): Promise<Testimonio[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("testimonios").select("*").order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((t) => ({
    id: t.id,
    nombre: t.nombre,
    ubicacion: t.ubicacion ?? "",
    foto: t.foto ?? "",
    comentario: t.comentario,
    estrellas: t.estrellas,
  }));
}

export async function getNovedadesAdmin(): Promise<Novedad[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("novedades").select("*").order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((n) => ({
    id: n.id,
    titulo: n.titulo,
    contenido: n.contenido,
    publicado: n.publicado,
    creadoEn: n.creado_en,
  }));
}

export type Visita = {
  id: string;
  creadoEn: string;
  nombre: string;
  email: string;
  telefono: string;
  fecha: string;
  horario: string;
  estado: string;
};

export type Proyecto = {
  id: string;
  nombre: string;
  slug: string;
  activo: boolean;
  creadoEn: string;
};

export async function getLeads(): Promise<Lead[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("leads").select("*").order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((l) => ({
    id: l.id,
    creadoEn: l.creado_en,
    tipo: l.tipo,
    nombre: l.nombre,
    apellido: l.apellido ?? undefined,
    dni: l.dni ?? undefined,
    email: l.email,
    telefono: l.telefono,
    mensaje: l.mensaje ?? undefined,
    manzana: l.manzana ?? undefined,
    lote: l.lote ?? undefined,
    estado: l.estado,
  }));
}

export async function getVisitas(): Promise<Visita[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("visitas").select("*").order("fecha", { ascending: true });
  if (error || !data) return [];

  return data.map((v) => ({
    id: v.id,
    creadoEn: v.creado_en,
    nombre: v.nombre,
    email: v.email,
    telefono: v.telefono,
    fecha: v.fecha,
    horario: v.horario,
    estado: v.estado,
  }));
}

export async function getProyectos(): Promise<Proyecto[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("proyectos").select("*").order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    activo: p.activo,
    creadoEn: p.creado_en,
  }));
}
