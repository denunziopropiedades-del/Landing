import { z } from "zod";

const dniSchema = z
  .string()
  .trim()
  .min(6, "DNI inválido")
  .max(10, "DNI inválido")
  .regex(/^\d+$/, "El DNI debe contener solo números");

const telefonoSchema = z.string().trim().min(6, "Teléfono inválido");

const cargoSchema = z.enum(["ayudante", "medio_oficial", "oficial", "oficial_especializado"]);

const disponibilidadInicioSchema = z
  .enum(["inmediata", "una_semana", "quince_dias", "a_convenir"])
  .optional()
  .or(z.literal(""));

const estadoSchema = z.enum(["pendiente", "preseleccionado", "entrevista", "aprobado", "contratado", "descartado"]);

/** Campos que completa el propio candidato en /postularme. */
export const postulacionSchema = z.object({
  nombreApellido: z.string().trim().min(3, "Ingresá tu nombre y apellido"),
  dni: dniSchema,
  telefono: telefonoSchema,
  localidad: z.string().trim().min(2, "Ingresá tu localidad"),
  edad: z.coerce.number().int().min(16, "Edad inválida").max(90, "Edad inválida"),
  cargo: cargoSchema,
  anosExperiencia: z.coerce.number().min(0, "Inválido").max(60, "Inválido"),
  especialidad: z.string().trim().max(200).optional().or(z.literal("")),
  trabajosQueSabe: z.string().trim().max(1000).optional().or(z.literal("")),
  experienciaComprobable: z.coerce.boolean().default(false),
  referenciasLaborales: z.string().trim().max(1000).optional().or(z.literal("")),
  disponibilidadInicio: disponibilidadInicioSchema,
  disponibilidadHoraria: z.string().trim().max(200).optional().or(z.literal("")),
  pretensionSalarialDiaria: z.coerce.number().min(0, "Inválido").max(10_000_000, "Inválido").optional(),
  ultimaRemuneracionDiaria: z.coerce.number().min(0, "Inválido").max(10_000_000, "Inválido").optional(),
  aceptaJornada: z.coerce.boolean().default(false),
  aceptaObra: z.coerce.boolean().default(false),
  herramientasPropias: z.coerce.boolean().default(false),
  movilidadPropia: z.coerce.boolean().default(false),
  observaciones: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PostulacionInput = z.infer<typeof postulacionSchema>;

/** El panel admin puede cargar/editar además el estado del candidato. */
export const candidatoAdminSchema = postulacionSchema.extend({
  estado: estadoSchema.default("pendiente"),
});

export type CandidatoAdminInput = z.infer<typeof candidatoAdminSchema>;

export const configuracionSchema = z.object({
  pesos: z.object({
    experiencia: z.coerce.number().min(0).max(100),
    cargo: z.coerce.number().min(0).max(100),
    especialidad: z.coerce.number().min(0).max(100),
    disponibilidad: z.coerce.number().min(0).max(100),
    pretensionSalarial: z.coerce.number().min(0).max(100),
    referencias: z.coerce.number().min(0).max(100),
    herramientas: z.coerce.number().min(0).max(100),
    movilidad: z.coerce.number().min(0).max(100),
  }),
  salarioReferencia: z.coerce.number().min(1, "Ingresá un valor de referencia"),
  mensajeWhatsapp: z.string().trim().min(5, "Escribí un mensaje"),
});

export type ConfiguracionInput = z.infer<typeof configuracionSchema>;
