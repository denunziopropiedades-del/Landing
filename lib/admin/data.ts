import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActividadLog,
  Banner,
  ComboLotes,
  ConfigFinanciacion,
  FaqItem,
  Gasto,
  ItemGaleria,
  Lead,
  Lote,
  Perfil,
  ProgresoItem,
  Promocion,
  Proyecto,
  Testimonio,
  Visita,
} from "@/types/site";
import type { Novedad } from "@/lib/content";

// Convierte a número o null. Trata null Y undefined como "sin valor" (una columna
// que todavía no existe en la base, por ejemplo, llega como undefined y no debe
// transformarse en NaN).
function numOrNull(v: unknown): number | null {
  return v === null || v === undefined ? null : Number(v);
}

/**
 * Getters "crudos" para el panel admin: a diferencia de lib/content.ts, NO
 * devuelven contenido semilla como fallback ni filtran por publicado/activo,
 * para que el staff vea el estado real de la base de datos.
 */

export async function getProyectosAdmin(): Promise<Proyecto[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("proyectos").select("*").order("orden");
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    descripcion: p.descripcion,
    ubicacion: p.ubicacion,
    ubicacionMapsUrl: p.ubicacion_maps_url,
    metaDescripcion: p.meta_descripcion ?? null,
    imagenPortada: p.imagen_portada,
    publicado: p.publicado,
    destacado: p.destacado,
    whatsappNumero: p.whatsapp_numero,
    orden: p.orden,
    celdaAnchoPct: p.celda_ancho_pct ?? null,
    celdaAltoPct: p.celda_alto_pct ?? null,
  }));
}

export async function getLotesAdmin(proyectoId: string): Promise<Lote[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("lotes")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("manzana")
    .order("numero");
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
    posX: numOrNull(l.pos_x),
    posY: numOrNull(l.pos_y),
    anticipoFinanciadoUsd: numOrNull(l.anticipo_financiado_usd),
    cuotasFinanciado: numOrNull(l.cuotas_financiado),
    valorCuotaFinanciadoUsd: numOrNull(l.valor_cuota_financiado_usd),
  }));
}

/** Todos los lotes de todos los proyectos (para selectores que cruzan desarrollos, ej. carga manual de clientes). */
export async function getLotesAdminTodos(): Promise<Lote[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("lotes").select("*").order("manzana").order("numero");
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
    posX: numOrNull(l.pos_x),
    posY: numOrNull(l.pos_y),
    anticipoFinanciadoUsd: numOrNull(l.anticipo_financiado_usd),
    cuotasFinanciado: numOrNull(l.cuotas_financiado),
    valorCuotaFinanciadoUsd: numOrNull(l.valor_cuota_financiado_usd),
  }));
}

export async function getGaleriaAdmin(proyectoId: string): Promise<ItemGaleria[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("galeria").select("*").eq("proyecto_id", proyectoId).order("orden");
  if (error || !data) return [];

  return data.map((g) => ({ id: g.id, proyectoId: g.proyecto_id, categoria: g.categoria, url: g.url, titulo: g.titulo }));
}

export async function getProgresoAdmin(proyectoId: string): Promise<ProgresoItem[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("progreso_desarrollo")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("orden");
  if (error || !data) return [];

  return data.map((p) => ({ id: p.id, proyectoId: p.proyecto_id, etapa: p.etapa, porcentaje: Number(p.porcentaje) }));
}

export async function getFinanciacionAdmin(proyectoId: string): Promise<ConfigFinanciacion> {
  const supabase = await getSupabaseServerClient();
  const fallback: ConfigFinanciacion = {
    anticipoMinimoPct: 20,
    anticipoMaximoPct: 50,
    cuotasOpciones: [12, 24, 36, 48, 60],
    interesAnualPct: 6,
  };
  if (!supabase) return fallback;

  const { data, error } = await supabase
    .from("financiacion_config")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .maybeSingle();
  if (error || !data) return fallback;

  return {
    anticipoMinimoPct: Number(data.anticipo_minimo_pct),
    anticipoMaximoPct: Number(data.anticipo_maximo_pct),
    cuotasOpciones: data.cuotas_opciones,
    interesAnualPct: Number(data.interes_anual_pct),
  };
}

export async function getComboLotesAdmin(proyectoId: string): Promise<ComboLotes> {
  const fallback: ComboLotes = {
    proyectoId,
    label1Lote: "1 lote",
    precio1LoteUsd: null,
    label2Lotes: "2 lotes juntos",
    precio2LotesUsd: null,
    label3Lotes: "3 lotes juntos",
    precio3LotesUsd: null,
  };
  const supabase = await getSupabaseServerClient();
  if (!supabase) return fallback;

  const { data, error } = await supabase.from("combos_lotes").select("*").eq("proyecto_id", proyectoId).maybeSingle();
  if (error || !data) return fallback;

  return {
    proyectoId,
    label1Lote: data.label_1_lote ?? "1 lote",
    precio1LoteUsd: numOrNull(data.precio_1_lote_usd),
    label2Lotes: data.label_2_lotes ?? "2 lotes juntos",
    precio2LotesUsd: numOrNull(data.precio_2_lotes_usd),
    label3Lotes: data.label_3_lotes ?? "3 lotes juntos",
    precio3LotesUsd: numOrNull(data.precio_3_lotes_usd),
  };
}

export async function getPromocionesAdmin(proyectoId: string): Promise<Promocion[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("promociones")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    proyectoId: p.proyecto_id,
    activa: p.activa,
    titulo: p.titulo,
    bajada: p.bajada,
    fechaFin: p.fecha_fin,
  }));
}

export async function getBannersAdmin(): Promise<Banner[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("banners").select("*").order("orden");
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

export async function getTestimoniosAdmin(): Promise<Testimonio[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("testimonios").select("*").order("orden");
  if (error || !data) return [];

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

export async function getFaqsAdmin(): Promise<FaqItem[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("faqs").select("*").order("orden");
  if (error || !data) return [];

  return data.map((f) => ({ id: f.id, proyectoId: f.proyecto_id, pregunta: f.pregunta, respuesta: f.respuesta }));
}

export async function getNovedadesAdmin(): Promise<Novedad[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("novedades").select("*").order("creado_en", { ascending: false });
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

export async function getLeads(): Promise<Lead[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("leads")
    .select("*, proyectos(nombre), lotes(nombre, numero), perfiles(nombre, email)")
    .order("creado_en", { ascending: false });
  if (error || !data) return [];

  return data.map((l) => ({
    id: l.id,
    creadoEn: l.creado_en,
    actualizadoEn: l.actualizado_en,
    tipo: l.tipo,
    proyectoId: l.proyecto_id,
    proyectoNombre: (l.proyectos as { nombre: string } | null)?.nombre,
    loteId: l.lote_id,
    loteNombre: (l.lotes as { nombre: string; numero: string } | null)?.nombre,
    loteNumero: (l.lotes as { nombre: string; numero: string } | null)?.numero,
    nombre: l.nombre,
    apellido: l.apellido ?? undefined,
    dni: l.dni ?? undefined,
    email: l.email,
    telefono: l.telefono,
    mensaje: l.mensaje ?? undefined,
    manzana: l.manzana ?? undefined,
    observaciones: l.observaciones ?? "",
    estado: l.estado,
    asignadoA: l.asignado_a,
    asignadoNombre: (l.perfiles as { nombre: string; email: string } | null)?.nombre,
    fechaNacimiento: l.fecha_nacimiento ?? null,
    numeroTransaccion: l.numero_transaccion ?? null,
    importeCobrado: numOrNull(l.importe_cobrado),
    sexo: l.sexo ?? null,
    fechaFirmaEscribania: l.fecha_firma_escribania ?? null,
    horarioFirmaEscribania: l.horario_firma_escribania ?? null,
    comisionUsd: numOrNull(l.comision_usd),
    honorariosUsd: numOrNull(l.honorarios_usd),
    honorariosArs: numOrNull(l.honorarios_ars),
    gastosArs: numOrNull(l.gastos_ars),
  }));
}

export async function getVisitas(): Promise<Visita[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("visitas")
    .select("*, proyectos(nombre)")
    .order("fecha", { ascending: true });
  if (error || !data) return [];

  return data.map((v) => ({
    id: v.id,
    creadoEn: v.creado_en,
    leadId: v.lead_id,
    proyectoId: v.proyecto_id,
    proyectoNombre: (v.proyectos as { nombre: string } | null)?.nombre,
    nombre: v.nombre,
    email: v.email,
    telefono: v.telefono,
    fecha: v.fecha,
    horario: v.horario,
    estado: v.estado,
    googleEventId: v.google_event_id,
  }));
}

export async function getPerfiles(): Promise<Perfil[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase.from("perfiles").select("*").order("creado_en");
  if (error || !data) return [];

  return data.map((p) => ({
    id: p.id,
    email: p.email,
    nombre: p.nombre,
    rol: p.rol,
    activo: p.activo,
    creadoEn: p.creado_en,
  }));
}

export async function getActividadLog(limite = 100): Promise<ActividadLog[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("actividad_log")
    .select("*")
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (error || !data) return [];

  return data.map((a) => ({
    id: a.id,
    creadoEn: a.creado_en,
    usuarioEmail: a.usuario_email,
    accion: a.accion,
    entidad: a.entidad,
    entidadId: a.entidad_id,
    detalle: a.detalle,
  }));
}

export async function getGastosAdmin(): Promise<Gasto[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("gastos")
    .select("*, proyectos(nombre)")
    .order("fecha", { ascending: false });
  if (error || !data) return [];

  return data.map((g) => ({
    id: g.id,
    proyectoId: g.proyecto_id,
    proyectoNombre: (g.proyectos as { nombre: string } | null)?.nombre,
    fecha: g.fecha,
    concepto: g.concepto,
    categoria: g.categoria,
    montoArs: numOrNull(g.monto_ars) ?? 0,
    creadoEn: g.creado_en,
  }));
}
