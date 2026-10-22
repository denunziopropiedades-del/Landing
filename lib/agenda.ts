/**
 * Reglas de la agenda de visitas (compartidas por el formulario web, la API
 * de disponibilidad y la página de reprogramación).
 *
 * - Turnos de visita cada 40 minutos, de 8:00 a 18:00, todos los días (lunes a lunes).
 * - La escribanía tiene prioridad: no se pueden agendar visitas desde 2 horas
 *   antes del inicio de una firma hasta 2 horas después de que termina.
 * - Solo las firmas de escribanía pueden quedar correlativas (una atrás de la
 *   otra); las visitas nunca se superponen con una firma ni con su margen.
 */

export const DURACION_VISITA_MINUTOS = 45;
export const DURACION_FIRMA_ESCRIBANIA_MINUTOS = 60;
export const MARGEN_ESCRIBANIA_MINUTOS = 120;

const PRIMER_TURNO_MINUTOS = 8 * 60;
const ULTIMO_TURNO_MINUTOS = 18 * 60;
const INTERVALO_TURNOS_MINUTOS = 40;

function aMinutos(horario: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(horario.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function aHorario(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

export function generarHorariosVisita(): string[] {
  const horarios: string[] = [];
  for (let m = PRIMER_TURNO_MINUTOS; m <= ULTIMO_TURNO_MINUTOS; m += INTERVALO_TURNOS_MINUTOS) {
    horarios.push(aHorario(m));
  }
  return horarios;
}

export const HORARIOS_VISITA = generarHorariosVisita();

/**
 * Indica si una visita que empieza en `horarioVisita` cae dentro de la franja
 * bloqueada por alguna de las firmas de escribanía del mismo día.
 */
export function bloqueadoPorEscribania(horarioVisita: string, horariosFirmas: string[]): boolean {
  const inicioVisita = aMinutos(horarioVisita);
  if (inicioVisita === null) return false;
  const finVisita = inicioVisita + DURACION_VISITA_MINUTOS;

  return horariosFirmas.some((h) => {
    const inicioFirma = aMinutos(h);
    if (inicioFirma === null) return false;
    const desde = inicioFirma - MARGEN_ESCRIBANIA_MINUTOS;
    const hasta = inicioFirma + DURACION_FIRMA_ESCRIBANIA_MINUTOS + MARGEN_ESCRIBANIA_MINUTOS;
    // La visita (con su duración) no puede tocar la franja [desde, hasta).
    return inicioVisita < hasta && finVisita > desde;
  });
}

/** Turnos del día que no se pueden reservar por estar cerca de una firma de escribanía. */
export function horariosBloqueadosPorEscribania(horariosFirmas: string[]): string[] {
  if (horariosFirmas.length === 0) return [];
  return HORARIOS_VISITA.filter((h) => bloqueadoPorEscribania(h, horariosFirmas));
}
