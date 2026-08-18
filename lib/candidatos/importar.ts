import { CARGO_LABEL, DISPONIBILIDAD_LABEL, ESTADO_LABEL } from "@/lib/candidatos/constants";
import type { Cargo, DisponibilidadInicio, EstadoCandidato } from "@/types/candidatos";

function normalizar(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Alias aceptados (normalizados) para cada columna del Excel, mapeados al campo interno. */
const ALIAS: Record<string, string[]> = {
  nombreApellido: ["nombre y apellido", "nombre", "candidato"],
  dni: ["dni"],
  telefono: ["telefono", "whatsapp", "celular"],
  localidad: ["localidad", "zona"],
  edad: ["edad"],
  cargo: ["cargo", "categoria", "puesto"],
  anosExperiencia: ["anos de experiencia", "anos experiencia", "experiencia", "años de experiencia"],
  especialidad: ["especialidad"],
  trabajosQueSabe: ["trabajos que sabe realizar", "trabajos"],
  experienciaComprobable: ["experiencia comprobable"],
  referenciasLaborales: ["referencias laborales", "referencias"],
  disponibilidadInicio: ["disponibilidad para comenzar", "disponibilidad de inicio"],
  disponibilidadHoraria: ["disponibilidad horaria"],
  pretensionSalarialDiaria: ["preferencia salarial diaria", "pretension salarial diaria", "pretension salarial"],
  ultimaRemuneracionDiaria: ["ultima remuneracion diaria cobrada", "ultima remuneracion diaria", "ultima remuneracion"],
  aceptaJornada: ["acepta trabajo por jornada", "acepta jornada"],
  aceptaObra: ["acepta trabajo por obra", "acepta obra"],
  herramientasPropias: ["posee herramientas propias", "herramientas propias", "herramientas"],
  movilidadPropia: ["posee movilidad", "movilidad propia", "movilidad"],
  observaciones: ["observaciones"],
  estado: ["estado del candidato", "estado"],
};

/** A partir de la fila de encabezados del Excel, arma un índice campo interno -> número de columna. */
export function mapearEncabezados(encabezados: string[]): Record<string, number> {
  const mapa: Record<string, number> = {};
  encabezados.forEach((h, i) => {
    if (!h) return;
    const norm = normalizar(h);
    for (const [campo, alias] of Object.entries(ALIAS)) {
      if (alias.includes(norm) && !(campo in mapa)) mapa[campo] = i;
    }
  });
  return mapa;
}

function parseNumero(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  if (typeof v === "number") return v;
  const limpio = String(v).replace(/[^\d]/g, "");
  return limpio ? Number(limpio) : undefined;
}

function parseBooleano(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  const s = normalizar(String(v ?? ""));
  return ["si", "sí", "true", "1", "x", "yes"].includes(s);
}

function mapearCargo(v: unknown): Cargo {
  const s = normalizar(String(v ?? ""));
  const encontrado = (Object.entries(CARGO_LABEL) as [Cargo, string][]).find(
    ([key, label]) => normalizar(label) === s || key === s
  );
  return encontrado?.[0] ?? "ayudante";
}

function mapearDisponibilidad(v: unknown): DisponibilidadInicio | null {
  const s = normalizar(String(v ?? ""));
  if (!s) return null;
  if (s.includes("inmediat")) return "inmediata";
  if (s.includes("15") || s.includes("quince")) return "quince_dias";
  if (s.includes("semana") || s.includes("7")) return "una_semana";
  const encontrado = (Object.entries(DISPONIBILIDAD_LABEL) as [DisponibilidadInicio, string][]).find(
    ([key, label]) => normalizar(label) === s || key === s
  );
  return encontrado?.[0] ?? "a_convenir";
}

function mapearEstado(v: unknown): EstadoCandidato {
  const s = normalizar(String(v ?? ""));
  const encontrado = (Object.entries(ESTADO_LABEL) as [EstadoCandidato, string][]).find(
    ([key, label]) => normalizar(label) === s || key === s
  );
  return encontrado?.[0] ?? "pendiente";
}

export type PayloadCandidatoImportado = {
  nombre_apellido: string;
  dni: string;
  telefono: string;
  localidad: string | null;
  edad: number | null;
  cargo: Cargo;
  anos_experiencia: number;
  especialidad: string | null;
  trabajos_que_sabe: string | null;
  experiencia_comprobable: boolean;
  referencias_laborales: string | null;
  disponibilidad_inicio: DisponibilidadInicio | null;
  disponibilidad_horaria: string | null;
  pretension_salarial_diaria: number | null;
  ultima_remuneracion_diaria: number | null;
  acepta_jornada: boolean;
  acepta_obra: boolean;
  herramientas_propias: boolean;
  movilidad_propia: boolean;
  observaciones: string | null;
  estado: EstadoCandidato;
};

/** Convierte una fila del Excel (ya indexada por mapearEncabezados) en un payload listo para insertar/actualizar. Devuelve null si faltan los datos mínimos (nombre, DNI y teléfono). */
export function procesarFila(fila: unknown[], mapa: Record<string, number>): PayloadCandidatoImportado | null {
  const get = (campo: string) => (campo in mapa ? fila[mapa[campo]] : undefined);

  const nombre = String(get("nombreApellido") ?? "").trim();
  const dni = String(get("dni") ?? "").replace(/\D/g, "");
  const telefono = String(get("telefono") ?? "").trim();

  if (!nombre || !dni || !telefono) return null;

  return {
    nombre_apellido: nombre,
    dni,
    telefono,
    localidad: String(get("localidad") ?? "").trim() || null,
    edad: parseNumero(get("edad")) ?? null,
    cargo: mapearCargo(get("cargo")),
    anos_experiencia: parseNumero(get("anosExperiencia")) ?? 0,
    especialidad: String(get("especialidad") ?? "").trim() || null,
    trabajos_que_sabe: String(get("trabajosQueSabe") ?? "").trim() || null,
    experiencia_comprobable: parseBooleano(get("experienciaComprobable")),
    referencias_laborales: String(get("referenciasLaborales") ?? "").trim() || null,
    disponibilidad_inicio: mapearDisponibilidad(get("disponibilidadInicio")),
    disponibilidad_horaria: String(get("disponibilidadHoraria") ?? "").trim() || null,
    pretension_salarial_diaria: parseNumero(get("pretensionSalarialDiaria")) ?? null,
    ultima_remuneracion_diaria: parseNumero(get("ultimaRemuneracionDiaria")) ?? null,
    acepta_jornada: parseBooleano(get("aceptaJornada")),
    acepta_obra: parseBooleano(get("aceptaObra")),
    herramientas_propias: parseBooleano(get("herramientasPropias")),
    movilidad_propia: parseBooleano(get("movilidadPropia")),
    observaciones: String(get("observaciones") ?? "").trim() || null,
    estado: get("estado") ? mapearEstado(get("estado")) : "pendiente",
  };
}
