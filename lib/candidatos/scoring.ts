import type { Candidato, Clasificacion, ConfiguracionCandidatos } from "@/types/candidatos";

const PUNTOS_CARGO: Record<Candidato["cargo"], number> = {
  ayudante: 0.25,
  medio_oficial: 0.55,
  oficial: 0.8,
  oficial_especializado: 1,
};

const PUNTOS_DISPONIBILIDAD: Record<NonNullable<Candidato["disponibilidadInicio"]>, number> = {
  inmediata: 1,
  una_semana: 0.7,
  quince_dias: 0.4,
  a_convenir: 0.2,
};

/**
 * Puntaje 0-100 a partir de los pesos configurables. Cada factor aporta entre
 * 0 y su peso; los pesos se normalizan para que sumen 100 aunque el admin
 * los haya dejado en otro total.
 */
export function calcularPuntaje(
  candidato: Pick<
    Candidato,
    | "anosExperiencia"
    | "cargo"
    | "especialidad"
    | "disponibilidadInicio"
    | "pretensionSalarialDiaria"
    | "referenciasLaborales"
    | "herramientasPropias"
    | "movilidadPropia"
  >,
  config: Pick<ConfiguracionCandidatos, "pesos" | "salarioReferencia">
): { puntaje: number; clasificacion: Clasificacion } {
  const pesos = config.pesos;
  const sumaPesos = Object.values(pesos).reduce((a, b) => a + b, 0) || 1;
  const factor = 100 / sumaPesos;

  const experienciaPct = Math.min(candidato.anosExperiencia / 10, 1);
  const cargoPct = PUNTOS_CARGO[candidato.cargo];
  const especialidadPct = candidato.especialidad && candidato.especialidad.trim().length > 0 ? 1 : 0.3;
  const disponibilidadPct = candidato.disponibilidadInicio ? PUNTOS_DISPONIBILIDAD[candidato.disponibilidadInicio] : 0.3;
  const referenciasPct = candidato.referenciasLaborales && candidato.referenciasLaborales.trim().length > 0 ? 1 : 0.3;
  const herramientasPct = candidato.herramientasPropias ? 1 : 0.4;
  const movilidadPct = candidato.movilidadPropia ? 1 : 0.5;

  let pretensionPct = 0.6;
  if (candidato.pretensionSalarialDiaria && config.salarioReferencia > 0) {
    const relativo = candidato.pretensionSalarialDiaria / config.salarioReferencia;
    if (relativo <= 0.85) pretensionPct = 1;
    else if (relativo <= 1) pretensionPct = 0.85;
    else if (relativo <= 1.2) pretensionPct = 0.55;
    else if (relativo <= 1.5) pretensionPct = 0.3;
    else pretensionPct = 0.1;
  }

  const puntajeCrudo =
    experienciaPct * pesos.experiencia +
    cargoPct * pesos.cargo +
    especialidadPct * pesos.especialidad +
    disponibilidadPct * pesos.disponibilidad +
    pretensionPct * pesos.pretensionSalarial +
    referenciasPct * pesos.referencias +
    herramientasPct * pesos.herramientas +
    movilidadPct * pesos.movilidad;

  const puntaje = Math.round(Math.min(100, Math.max(0, puntajeCrudo * factor)));

  return { puntaje, clasificacion: clasificar(puntaje) };
}

export function clasificar(puntaje: number): Clasificacion {
  if (puntaje >= 85) return "Excelente candidato";
  if (puntaje >= 65) return "Buen candidato";
  if (puntaje >= 45) return "Candidato a evaluar";
  return "Baja prioridad";
}

export const CLASIFICACION_COLOR: Record<Clasificacion, string> = {
  "Excelente candidato": "text-emerald-600",
  "Buen candidato": "text-obra-orange-600",
  "Candidato a evaluar": "text-amber-600",
  "Baja prioridad": "text-slate-500",
};
