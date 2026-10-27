import { z } from "zod";

const planFinanciacionSchema = z.object({
  anticipoUsd: z.number().positive(),
  cuotas: z.number().int().positive(),
  valorCuotaUsd: z.number().positive(),
});

export const reservaObjectSchema = z.object({
  proyectoId: z.string().min(1, "Proyecto inválido"),
  loteIds: z.array(z.string().min(1)).min(1, "Elegí al menos un lote").max(3, "Podés reservar hasta 3 lotes"),
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  apellido: z.string().trim().min(2, "Ingresá tu apellido"),
  dni: z
    .string()
    .trim()
    .min(7, "DNI inválido")
    .max(9, "DNI inválido")
    .regex(/^\d+$/, "El DNI debe contener solo números"),
  email: z.string().trim().email("Email inválido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  formaPago: z.enum(["contado", "financiado"]).default("contado"),
  planFinanciacion: planFinanciacionSchema.nullable().default(null),
  terminos: z.literal(true, {
    error: "Debés aceptar los términos y condiciones",
  }),
});

export const reservaSchema = reservaObjectSchema.refine(
  (data) => data.formaPago !== "financiado" || data.planFinanciacion !== null,
  { message: "Elegí un plan de financiación", path: ["planFinanciacion"] }
);

export type ReservaInput = z.infer<typeof reservaObjectSchema>;

export const contactoSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Email inválido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  mensaje: z.string().trim().min(5, "Contanos brevemente tu consulta"),
  quiereVisita: z.boolean().optional(),
});

export type ContactoInput = z.infer<typeof contactoSchema>;

/** Consulta por una propiedad publicada o pedido de tasación. */
export const consultaPropiedadSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Ingresá un mail válido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  mensaje: z.string().trim().max(2000).optional(),
  propiedadId: z.string().uuid().optional(),
  tasacion: z
    .object({
      operacion: z.enum(["venta", "alquiler", "ambas"]),
      tipo: z.string().trim().min(1, "Elegí el tipo"),
      partido: z.string().trim().min(1, "Elegí el partido"),
      direccion: z.string().trim().max(200).optional(),
    })
    .optional(),
});

export type ConsultaPropiedadInput = z.infer<typeof consultaPropiedadSchema>;

export const visitaSchema = z.object({
  proyectoId: z.string().optional(),
  /** Visita a una propiedad publicada (casa, depto, campo) en lugar de un desarrollo. */
  propiedadId: z.string().uuid().optional(),
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  // Obligatorio: se usa para la confirmación y para armar públicos en Meta Ads.
  email: z.string().trim().email("Ingresá un mail válido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  fecha: z.string().min(1, "Elegí una fecha"),
  horario: z.string().min(1, "Elegí un horario"),
});

export type VisitaInput = z.infer<typeof visitaSchema>;

/** Alta de cliente por link: datos personales y para contratos. */
export const altaClienteSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  apellido: z.string().trim().min(2, "Ingresá tu apellido"),
  dni: z.string().trim().min(6, "Ingresá tu DNI").max(15),
  cuit: z.string().trim().max(20).optional().default(""),
  email: z.string().trim().email("Email inválido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  nacionalidad: z.string().trim().min(3, "Ingresá tu nacionalidad").max(40),
  estadoCivil: z.string().trim().min(3, "Elegí tu estado civil").max(40),
  domicilio: z.string().trim().min(4, "Ingresá calle y número").max(120),
  localidad: z.string().trim().min(2, "Ingresá tu localidad").max(60),
  partido: z.string().trim().min(2, "Ingresá tu partido").max(60),
  provincia: z.string().trim().min(2).max(40).default("Buenos Aires"),
  interes: z.string().trim().max(200).optional().default(""),
  /** Campo trampa para bots: tiene que llegar vacío. */
  web: z.string().max(0).optional().default(""),
});

export type AltaClienteInput = z.infer<typeof altaClienteSchema>;
