import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { CARGOS } from "@/lib/candidatos/constants";
import type { Candidato, ConfiguracionCandidatos, FiltrosCandidatos, IndicadoresCandidatos } from "@/types/candidatos";

const CONFIG_DEFAULT: ConfiguracionCandidatos = {
  pesos: {
    experiencia: 20,
    cargo: 20,
    especialidad: 10,
    disponibilidad: 15,
    pretensionSalarial: 15,
    referencias: 10,
    herramientas: 5,
    movilidad: 5,
  },
  salarioReferencia: 55000,
  mensajeWhatsapp:
    "Hola {{nombre}}, somos del equipo de selección. Vimos tu postulación para el puesto de {{cargo}}. ¿Nos confirmás si actualmente estás disponible para trabajar?",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCandidato(row: any): Candidato {
  return {
    id: row.id,
    creadoEn: row.creado_en,
    actualizadoEn: row.actualizado_en,
    nombreApellido: row.nombre_apellido,
    dni: row.dni,
    telefono: row.telefono,
    localidad: row.localidad,
    edad: row.edad,
    cargo: row.cargo,
    anosExperiencia: Number(row.anos_experiencia ?? 0),
    especialidad: row.especialidad,
    trabajosQueSabe: row.trabajos_que_sabe,
    experienciaComprobable: row.experiencia_comprobable,
    referenciasLaborales: row.referencias_laborales,
    disponibilidadInicio: row.disponibilidad_inicio,
    disponibilidadHoraria: row.disponibilidad_horaria,
    pretensionSalarialDiaria: row.pretension_salarial_diaria === null ? null : Number(row.pretension_salarial_diaria),
    ultimaRemuneracionDiaria: row.ultima_remuneracion_diaria === null ? null : Number(row.ultima_remuneracion_diaria),
    aceptaJornada: row.acepta_jornada,
    aceptaObra: row.acepta_obra,
    herramientasPropias: row.herramientas_propias,
    movilidadPropia: row.movilidad_propia,
    observaciones: row.observaciones,
    estado: row.estado,
    origen: row.origen,
    puntaje: row.puntaje ?? 0,
    clasificacion: row.clasificacion,
  };
}

/** Cliente de lectura: usa la sesión del admin logueado (respeta RLS). */
async function getClienteLectura() {
  return getSupabaseServerClient();
}

export async function getCandidatos(filtros: FiltrosCandidatos = {}): Promise<Candidato[]> {
  const supabase = await getClienteLectura();
  if (!supabase) return [];

  let query = supabase.from("candidatos").select("*");

  if (filtros.cargo) query = query.eq("cargo", filtros.cargo);
  if (filtros.estado) query = query.eq("estado", filtros.estado);
  if (filtros.localidad) query = query.ilike("localidad", `%${filtros.localidad}%`);
  if (filtros.especialidad) query = query.ilike("especialidad", `%${filtros.especialidad}%`);
  if (filtros.disponibilidad) query = query.eq("disponibilidad_inicio", filtros.disponibilidad);
  if (typeof filtros.experienciaMinima === "number") query = query.gte("anos_experiencia", filtros.experienciaMinima);
  if (typeof filtros.experienciaComprobable === "boolean")
    query = query.eq("experiencia_comprobable", filtros.experienciaComprobable);
  if (typeof filtros.herramientasPropias === "boolean") query = query.eq("herramientas_propias", filtros.herramientasPropias);
  if (typeof filtros.movilidadPropia === "boolean") query = query.eq("movilidad_propia", filtros.movilidadPropia);
  if (typeof filtros.pretensionMax === "number") query = query.lte("pretension_salarial_diaria", filtros.pretensionMax);
  if (typeof filtros.pretensionMin === "number") query = query.gte("pretension_salarial_diaria", filtros.pretensionMin);
  if (filtros.busqueda) {
    const b = filtros.busqueda.trim();
    query = query.or(
      `nombre_apellido.ilike.%${b}%,dni.ilike.%${b}%,telefono.ilike.%${b}%,localidad.ilike.%${b}%,especialidad.ilike.%${b}%`
    );
  }

  switch (filtros.orden) {
    case "puntaje":
      query = query.order("puntaje", { ascending: false });
      break;
    case "pretension_asc":
      query = query.order("pretension_salarial_diaria", { ascending: true, nullsFirst: false });
      break;
    case "pretension_desc":
      query = query.order("pretension_salarial_diaria", { ascending: false, nullsFirst: false });
      break;
    case "experiencia":
      query = query.order("anos_experiencia", { ascending: false });
      break;
    default:
      query = query.order("creado_en", { ascending: false });
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error al leer candidatos", error);
    return [];
  }
  return (data ?? []).map(mapCandidato);
}

export async function getCandidato(id: string): Promise<Candidato | null> {
  const supabase = await getClienteLectura();
  if (!supabase) return null;
  const { data, error } = await supabase.from("candidatos").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return mapCandidato(data);
}

/** Busca por DNI o teléfono para detección de duplicados (usa cliente admin: se llama desde contextos sin sesión, como el alta pública). */
export async function buscarDuplicado(dni: string, telefono: string): Promise<Candidato | null> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return null;
  const { data, error } = await admin
    .from("candidatos")
    .select("*")
    .or(`dni.eq.${dni},telefono.eq.${telefono}`)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return mapCandidato(data);
}

export async function getIndicadores(): Promise<IndicadoresCandidatos> {
  const candidatos = await getCandidatos();

  const porCargo = CARGOS.reduce(
    (acc, cargo) => {
      acc[cargo] = candidatos.filter((c) => c.cargo === cargo).length;
      return acc;
    },
    {} as IndicadoresCandidatos["porCargo"]
  );

  const pretensiones = candidatos
    .map((c) => c.pretensionSalarialDiaria)
    .filter((v): v is number => typeof v === "number" && v > 0);

  return {
    total: candidatos.length,
    porCargo,
    disponibilidadInmediata: candidatos.filter((c) => c.disponibilidadInicio === "inmediata").length,
    preseleccionados: candidatos.filter((c) => c.estado === "preseleccionado").length,
    enEntrevista: candidatos.filter((c) => c.estado === "entrevista").length,
    contratados: candidatos.filter((c) => c.estado === "contratado").length,
    pretensionPromedio:
      pretensiones.length > 0 ? Math.round(pretensiones.reduce((a, b) => a + b, 0) / pretensiones.length) : null,
    pretensionMinima: pretensiones.length > 0 ? Math.min(...pretensiones) : null,
    pretensionMaxima: pretensiones.length > 0 ? Math.max(...pretensiones) : null,
  };
}

export async function getConfiguracion(): Promise<ConfiguracionCandidatos> {
  const supabase = await getClienteLectura();
  if (!supabase) return CONFIG_DEFAULT;

  const { data, error } = await supabase.from("candidatos_configuracion").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return CONFIG_DEFAULT;

  return {
    pesos: data.pesos ?? CONFIG_DEFAULT.pesos,
    salarioReferencia: Number(data.salario_referencia ?? CONFIG_DEFAULT.salarioReferencia),
    mensajeWhatsapp: data.mensaje_whatsapp ?? CONFIG_DEFAULT.mensajeWhatsapp,
  };
}

/** Configuración leída con cliente admin (sin depender de sesión), para el alta pública. */
export async function getConfiguracionPublica(): Promise<ConfiguracionCandidatos> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return CONFIG_DEFAULT;
  const { data, error } = await admin.from("candidatos_configuracion").select("*").eq("id", 1).maybeSingle();
  if (error || !data) return CONFIG_DEFAULT;
  return {
    pesos: data.pesos ?? CONFIG_DEFAULT.pesos,
    salarioReferencia: Number(data.salario_referencia ?? CONFIG_DEFAULT.salarioReferencia),
    mensajeWhatsapp: data.mensaje_whatsapp ?? CONFIG_DEFAULT.mensajeWhatsapp,
  };
}
