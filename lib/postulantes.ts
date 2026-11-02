import { z } from "zod";

/** Puestos que se ofrecen en "Trabajá con nosotros". */
export const PUESTOS = [
  { value: "asesor-comercial", label: "Asesor/a comercial inmobiliario/a", grupo: "Equipo comercial" },
  { value: "vendedor-lotes", label: "Vendedor/a de lotes (desarrollos)", grupo: "Equipo comercial" },
  { value: "captador", label: "Captador/a de propiedades", grupo: "Equipo comercial" },
  { value: "marketing", label: "Marketing digital / redes", grupo: "Equipo comercial" },
  { value: "administrativo", label: "Administración y cobranzas", grupo: "Equipo comercial" },
  { value: "abogado", label: "Abogado/a", grupo: "Profesionales" },
  { value: "agrimensor", label: "Agrimensor/a", grupo: "Profesionales" },
  { value: "martillero", label: "Martillero/a Público/a", grupo: "Profesionales" },
  { value: "albanil", label: "Albañil", grupo: "Construcción" },
  { value: "pintor", label: "Pintor/a", grupo: "Construcción" },
  { value: "otro", label: "Otro / candidatura espontánea", grupo: "Otros" },
] as const;

export const GRUPOS_PUESTOS = ["Equipo comercial", "Profesionales", "Construcción", "Otros"] as const;

export const DISPONIBILIDADES = [
  { value: "completa", label: "Jornada completa" },
  { value: "media", label: "Media jornada" },
  { value: "fines-de-semana", label: "Fines de semana" },
  { value: "flexible", label: "Flexible / a convenir" },
] as const;

export const EXPERIENCIAS = [
  { value: "sin-experiencia", label: "Sin experiencia (con ganas de aprender)" },
  { value: "menos-2", label: "Menos de 2 años" },
  { value: "2-5", label: "De 2 a 5 años" },
  { value: "mas-5", label: "Más de 5 años" },
] as const;

export const ESTADOS_POSTULANTE = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "entrevista", label: "Entrevista" },
  { value: "incorporado", label: "Incorporado" },
  { value: "descartado", label: "Descartado" },
] as const;

/** Puestos que piden matrícula profesional. */
export const PUESTOS_CON_MATRICULA = ["abogado", "agrimensor", "martillero"];

export type EstadoPostulante = (typeof ESTADOS_POSTULANTE)[number]["value"];

const valores = <T extends readonly { value: string }[]>(lista: T) =>
  lista.map((x) => x.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

export const labelDe = (lista: readonly { value: string; label: string }[], v: string | null | undefined) =>
  lista.find((x) => x.value === v)?.label ?? v ?? "";

export const postulanteSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  email: z.string().trim().email("Ingresá un mail válido").max(200),
  telefono: z.string().trim().min(6, "Teléfono inválido").max(40),
  localidad: z.string().trim().min(2, "Contanos dónde vivís").max(120),
  puesto: z.enum(valores(PUESTOS)),
  experiencia: z.enum(valores(EXPERIENCIAS)),
  disponibilidad: z.enum(valores(DISPONIBILIDADES)),
  movilidad: z.boolean(),
  matricula: z.string().trim().max(120).optional(),
  linkedin: z.string().trim().max(300).optional(),
  mensaje: z.string().trim().max(2000).optional(),
});

export type PostulanteInput = z.infer<typeof postulanteSchema>;

export const CV_MAX_BYTES = 4 * 1024 * 1024; // Vercel corta los pedidos de más de 4,5 MB.
export const CV_TIPOS: Record<string, string> = {
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
};

export type Postulante = {
  id: string;
  creadoEn: string;
  nombre: string;
  email: string;
  telefono: string;
  localidad: string | null;
  puesto: string;
  experiencia: string | null;
  disponibilidad: string | null;
  movilidad: boolean | null;
  matricula: string | null;
  linkedin: string | null;
  mensaje: string | null;
  cvPath: string | null;
  cvNombre: string | null;
  estado: EstadoPostulante;
  notas: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapPostulante(r: any): Postulante {
  return {
    id: r.id,
    creadoEn: r.creado_en,
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    localidad: r.localidad,
    puesto: r.puesto,
    experiencia: r.experiencia,
    disponibilidad: r.disponibilidad,
    movilidad: r.movilidad,
    matricula: r.matricula ?? null,
    linkedin: r.linkedin,
    mensaje: r.mensaje,
    cvPath: r.cv_path,
    cvNombre: r.cv_nombre,
    estado: r.estado,
    notas: r.notas,
  };
}
