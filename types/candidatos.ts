export type Cargo = "ayudante" | "medio_oficial" | "oficial" | "oficial_especializado";

export type EstadoCandidato = "pendiente" | "preseleccionado" | "entrevista" | "aprobado" | "contratado" | "descartado";

export type DisponibilidadInicio = "inmediata" | "una_semana" | "quince_dias" | "a_convenir";

export type OrigenCandidato = "publica" | "manual" | "importado";

export type Clasificacion = "Excelente candidato" | "Buen candidato" | "Candidato a evaluar" | "Baja prioridad";

export type Candidato = {
  id: string;
  creadoEn: string;
  actualizadoEn: string;
  nombreApellido: string;
  dni: string;
  telefono: string;
  localidad: string | null;
  edad: number | null;
  cargo: Cargo;
  anosExperiencia: number;
  especialidad: string | null;
  trabajosQueSabe: string | null;
  experienciaComprobable: boolean;
  referenciasLaborales: string | null;
  disponibilidadInicio: DisponibilidadInicio | null;
  disponibilidadHoraria: string | null;
  pretensionSalarialDiaria: number | null;
  ultimaRemuneracionDiaria: number | null;
  aceptaJornada: boolean;
  aceptaObra: boolean;
  herramientasPropias: boolean;
  movilidadPropia: boolean;
  observaciones: string | null;
  estado: EstadoCandidato;
  origen: OrigenCandidato;
  puntaje: number;
  clasificacion: Clasificacion | null;
};

export type PesosPuntaje = {
  experiencia: number;
  cargo: number;
  especialidad: number;
  disponibilidad: number;
  pretensionSalarial: number;
  referencias: number;
  herramientas: number;
  movilidad: number;
};

export type ConfiguracionCandidatos = {
  pesos: PesosPuntaje;
  salarioReferencia: number;
  mensajeWhatsapp: string;
};

export type FiltrosCandidatos = {
  busqueda?: string;
  cargo?: Cargo;
  localidad?: string;
  experienciaMinima?: number;
  especialidad?: string;
  pretensionMax?: number;
  pretensionMin?: number;
  disponibilidad?: DisponibilidadInicio;
  experienciaComprobable?: boolean;
  herramientasPropias?: boolean;
  movilidadPropia?: boolean;
  estado?: EstadoCandidato;
  orden?: "recientes" | "puntaje" | "pretension_asc" | "pretension_desc" | "experiencia";
};

export type IndicadoresCandidatos = {
  total: number;
  porCargo: Record<Cargo, number>;
  disponibilidadInmediata: number;
  preseleccionados: number;
  enEntrevista: number;
  contratados: number;
  pretensionPromedio: number | null;
  pretensionMinima: number | null;
  pretensionMaxima: number | null;
};
