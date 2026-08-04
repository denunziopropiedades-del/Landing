import { z } from "zod";

export const reservaSchema = z.object({
  proyectoId: z.string().min(1, "Proyecto inválido"),
  loteId: z.string().min(1, "Seleccioná un lote"),
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
  terminos: z.literal(true, {
    error: "Debés aceptar los términos y condiciones",
  }),
});

export type ReservaInput = z.infer<typeof reservaSchema>;

export const contactoSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Email inválido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  mensaje: z.string().trim().min(5, "Contanos brevemente tu consulta"),
});

export type ContactoInput = z.infer<typeof contactoSchema>;

export const visitaSchema = z.object({
  proyectoId: z.string().optional(),
  nombre: z.string().trim().min(2, "Ingresá tu nombre"),
  email: z.string().trim().email("Email inválido"),
  telefono: z.string().trim().min(6, "Teléfono inválido"),
  fecha: z.string().min(1, "Elegí una fecha"),
  horario: z.string().min(1, "Elegí un horario"),
});

export type VisitaInput = z.infer<typeof visitaSchema>;
