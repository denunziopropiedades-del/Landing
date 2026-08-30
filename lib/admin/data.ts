import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  ActividadLog,
  Banner,
  ComboLotes,
  ConfigFinanciacion,
  Cuota,
  FaqItem,
  Gasto,
  ItemGaleria,
  Lead,
  Lote,
  LoteDeLead,
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
    escribaniaNombre: p.escribania_nombre ?? null,
    escribaniaDireccion: p.escribania_direccion ?? null,
    escribaniaMapsUrl: p.escribania_maps_url ?? null,
    escribaniaInstrucciones: p.escribania_instrucciones ?? null,
    documentosRequeridos: (p.documentos_requeridos as string[] | null) ?? [],
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
    planesFijos: [],
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
    planesFijos: (data.planes_fijos ?? []) as ConfigFinanciacion["planesFijos"],
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
    beneficio1: "Escritura garantizada",
    beneficio2: null,
    beneficio3: null,
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
    beneficio1: data.beneficio_1 ?? null,
    beneficio2: data.beneficio_2 ?? null,
    beneficio3: data.beneficio_3 ?? null,
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

  const baseSelect =
    "*, proyectos(nombre), lotes(nombre, numero, manzana, superficie_m2), perfiles(nombre, email), lead_lotes(lotes(id, manzana, numero, superficie_m2, nombre))";

  let { data, error } = await supabase
    .from("leads")
    .select(`${baseSelect}, cuotas(pagada, vencimiento)`)
    .order("creado_en", { ascending: false });

  if (error) {
    // La tabla "cuotas" es reciente: si todavía no se corrió su migración en este
    // entorno, este join rompe la consulta entera y antes hacía desaparecer TODO
    // el CRM. Reintentamos sin cuotas para que los leads se sigan viendo igual.
    console.error("Fallo el join con cuotas en getLeads(), reintentando sin él", error);
    ({ data, error } = await supabase.from("leads").select(baseSelect).order("creado_en", { ascending: false }));
  }
  if (error || !data) return [];

  return data.map((l) => {
    const lotesOperacion = (
      (l.lead_lotes ?? []) as unknown as {
        lotes: { id: string; manzana: string; numero: string; superficie_m2: number; nombre: string } | null;
      }[]
    )
      .map((ll) => ll.lotes)
      .filter((lo): lo is NonNullable<typeof lo> => lo !== null);

    const loteSingular = l.lotes as unknown as {
      nombre: string;
      numero: string;
      manzana: string;
      superficie_m2: number;
    } | null;

    const lotes: LoteDeLead[] =
      lotesOperacion.length > 0
        ? lotesOperacion.map((lo) => ({
            id: lo.id,
            manzana: lo.manzana,
            numero: lo.numero,
            superficieM2: lo.superficie_m2,
            nombre: lo.nombre,
          }))
        : loteSingular && l.lote_id
          ? [
              {
                id: l.lote_id,
                manzana: loteSingular.manzana,
                numero: loteSingular.numero,
                superficieM2: loteSingular.superficie_m2,
                nombre: loteSingular.nombre,
              },
            ]
          : [];

    return {
    id: l.id,
    creadoEn: l.creado_en,
    actualizadoEn: l.actualizado_en,
    tipo: l.tipo,
    proyectoId: l.proyecto_id,
    proyectoNombre: (l.proyectos as { nombre: string } | null)?.nombre,
    loteId: l.lote_id,
    loteNombre: lotes[0]?.nombre,
    loteNumero: lotes.length > 1 ? lotes.map((x) => x.numero).join(", ") : lotes[0]?.numero,
    lotes,
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
    pagoConfirmadoEn: l.pago_confirmado_en ?? null,
    pagoMercadopagoId: l.pago_mercadopago_id ?? null,
    documentosEntregados: (l.documentos_entregados as string[] | null) ?? [],
    formaPago: (l.forma_pago as "contado" | "financiado" | null) ?? "contado",
    planFinanciacion: (l.plan_financiacion as Lead["planFinanciacion"]) ?? null,
    linkPagoSena: l.link_pago_sena ?? null,
    ...(() => {
      const cs = (l.cuotas ?? []) as { pagada: boolean; vencimiento: string }[];
      const hoyIso = new Date().toISOString().slice(0, 10);
      const pendientes = cs.filter((c) => !c.pagada);
      return {
        cantidadCuotas: cs.length,
        cuotasPagadas: cs.length - pendientes.length,
        cuotasEnMora: pendientes.filter((c) => c.vencimiento < hoyIso).length,
        proximoVencimientoCuota: pendientes.sort((a, b) => a.vencimiento.localeCompare(b.vencimiento))[0]?.vencimiento ?? null,
      };
    })(),
    };
  });
}

/** Todas las cuotas de clientes financiados, con los datos del cliente embebidos
 * y los días de atraso ya calculados, para el panel de Cobranzas. */
export async function getCuotasAdmin(): Promise<Cuota[]> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("cuotas")
    .select(
      "*, leads(nombre, apellido, email, telefono, manzana, proyectos(nombre), lead_lotes(lotes(id, manzana, numero, superficie_m2, nombre)))"
    )
    .order("vencimiento", { ascending: true });
  if (error || !data) return [];

  const hoyIso = new Date().toISOString().slice(0, 10);

  return data.map((c) => {
    const lead = c.leads as unknown as {
      nombre: string;
      apellido: string | null;
      email: string;
      telefono: string;
      manzana: string | null;
      proyectos: { nombre: string } | null;
      lead_lotes: { lotes: { id: string; manzana: string; numero: string; superficie_m2: number; nombre: string } | null }[];
    } | null;

    const lotes: LoteDeLead[] = (lead?.lead_lotes ?? [])
      .map((ll) => ll.lotes)
      .filter((lo): lo is NonNullable<typeof lo> => lo !== null)
      .map((lo) => ({ id: lo.id, manzana: lo.manzana, numero: lo.numero, superficieM2: lo.superficie_m2, nombre: lo.nombre }));

    const diasMora =
      !c.pagada && c.vencimiento < hoyIso
        ? Math.floor((Date.now() - new Date(`${c.vencimiento}T00:00:00`).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    return {
      id: c.id,
      leadId: c.lead_id,
      numero: c.numero,
      montoUsd: Number(c.monto_usd),
      vencimiento: c.vencimiento,
      pagada: c.pagada,
      pagadoEn: c.pagado_en ?? null,
      montoPagadoUsd: numOrNull(c.monto_pagado_usd),
      diasMora,
      lead: {
        nombre: lead?.nombre ?? "",
        apellido: lead?.apellido ?? undefined,
        email: lead?.email ?? "",
        telefono: lead?.telefono ?? "",
        proyectoNombre: lead?.proyectos?.nombre,
        manzana: lead?.manzana ?? undefined,
        lotes,
      },
    };
  });
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
