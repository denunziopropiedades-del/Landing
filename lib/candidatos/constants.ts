import type { Cargo, DisponibilidadInicio, EstadoCandidato } from "@/types/candidatos";

export const CARGO_LABEL: Record<Cargo, string> = {
  ayudante: "Ayudante",
  medio_oficial: "Medio Oficial",
  oficial: "Oficial",
  oficial_especializado: "Oficial Especializado",
};

export const CARGOS: Cargo[] = ["ayudante", "medio_oficial", "oficial", "oficial_especializado"];

export const ESTADO_LABEL: Record<EstadoCandidato, string> = {
  pendiente: "Pendiente",
  preseleccionado: "Preseleccionado",
  entrevista: "Entrevista",
  aprobado: "Aprobado",
  contratado: "Contratado",
  descartado: "Descartado",
};

export const ESTADOS: EstadoCandidato[] = [
  "pendiente",
  "preseleccionado",
  "entrevista",
  "aprobado",
  "contratado",
  "descartado",
];

export const ESTADO_COLOR: Record<EstadoCandidato, string> = {
  pendiente: "bg-slate-100 text-slate-700 ring-slate-300",
  preseleccionado: "bg-sky-100 text-sky-700 ring-sky-300",
  entrevista: "bg-violet-100 text-violet-700 ring-violet-300",
  aprobado: "bg-emerald-100 text-emerald-700 ring-emerald-300",
  contratado: "bg-obra-orange-100 text-obra-orange-700 ring-obra-orange-300",
  descartado: "bg-red-100 text-red-700 ring-red-300",
};

export const DISPONIBILIDAD_LABEL: Record<DisponibilidadInicio, string> = {
  inmediata: "Inmediata",
  una_semana: "En 1 semana",
  quince_dias: "En 15 días",
  a_convenir: "A convenir",
};

export const DISPONIBILIDADES: DisponibilidadInicio[] = ["inmediata", "una_semana", "quince_dias", "a_convenir"];
