/** Tipos y utilidades del módulo de documentos que sirven en servidor y navegador (sin dependencias de Node). */

/* ───────── Identidad institucional (va en PDFs, mails, mensajes y páginas) ───────── */

export const INSTITUCION = {
  nombre: "DE NUNZIO NEGOCIOS INMOBILIARIOS",
  titular: "Matías De Nunzio",
  titulo: "Martillero Público y Corredor Público",
  matricula: "Matrícula COL 7886",
  whatsapp: ["11-2742-4512", "11-6136-5523"],
  whatsappIntl: "5491127424512",
  leyenda: "Todas las operaciones son gestionadas mediante la inmobiliaria.",
};

export const sitio = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

/* ───────── Tipos ───────── */

export type TipoDoc = "reserva" | "libre_deuda";
export type EstadoDoc = "emitido" | "enviado" | "aceptado" | "rechazado" | "vencido" | "anulado";

export type DatosReserva = {
  inmueble: string;
  valorVenta: number | null;
  monedaVenta: "USD" | "ARS";
  importeReserva: number;
  monedaReserva: "USD" | "ARS";
  formaPagoSaldo: string | null;
  /** Honorarios profesionales del corredor: % sobre el monto total de la operación. */
  honorariosPct?: number | null;
  condiciones: string;
};

export type DatosLibreDeuda = {
  origen: "lote" | "alquiler";
  inmueble: string;
  alDia: string; // fecha de corte YYYY-MM-DD
  cancelacionTotal: boolean;
  detalle: string[]; // renglones de resumen (cuotas pagas, último período, etc.)
};

export type DocEmitido = {
  id: string;
  tipo: TipoDoc;
  numero: string;
  codigoVerificacion: string;
  version: number;
  estado: EstadoDoc;
  leadId: string | null;
  alqContratoId: string | null;
  clienteNombre: string;
  clienteEmail: string | null;
  clienteTelefono: string | null;
  clienteDni: string | null;
  datos: DatosReserva | DatosLibreDeuda;
  aceptaHabilitada: boolean;
  venceEn: string | null;
  pdfPath: string | null;
  pdfSha256: string | null;
  emitidoEn: string;
  emitidoPorEmail: string | null;
  anuladoEn: string | null;
  anuladoMotivo: string | null;
  /** Pago de la reserva: null en certificados. */
  pagoEstado: "pendiente" | "abonado" | null;
  pagoLink: string | null;
  pagoMonto: number | null;
  pagoMedio: string | null;
  pagoEn: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapDoc = (r: any): DocEmitido => ({
  id: r.id,
  tipo: r.tipo,
  numero: r.numero,
  codigoVerificacion: r.codigo_verificacion,
  version: Number(r.version ?? 1),
  estado: r.estado,
  leadId: r.lead_id ?? null,
  alqContratoId: r.alq_contrato_id ?? null,
  clienteNombre: r.cliente_nombre,
  clienteEmail: r.cliente_email ?? null,
  clienteTelefono: r.cliente_telefono ?? null,
  clienteDni: r.cliente_dni ?? null,
  datos: r.datos ?? {},
  aceptaHabilitada: !!r.acepta_habilitada,
  venceEn: r.vence_en ?? null,
  pdfPath: r.pdf_path ?? null,
  pdfSha256: r.pdf_sha256 ?? null,
  emitidoEn: r.emitido_en,
  emitidoPorEmail: r.emitido_por_email ?? null,
  anuladoEn: r.anulado_en ?? null,
  anuladoMotivo: r.anulado_motivo ?? null,
  pagoEstado: r.pago_estado ?? null,
  pagoLink: r.pago_link ?? null,
  pagoMonto: r.pago_monto === null || r.pago_monto === undefined ? null : Number(r.pago_monto),
  pagoMedio: r.pago_medio ?? null,
  pagoEn: r.pago_en ?? null,
});

/* ───────── Varios ───────── */

export const PREFIJO: Record<TipoDoc, string> = { reserva: "RES", libre_deuda: "LD" };
export const NOMBRE_TIPO: Record<TipoDoc, string> = { reserva: "Reserva inmobiliaria", libre_deuda: "Certificado de libre deuda" };

export const hoyAr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

export function fechaAr(iso: string | null | undefined, conHora = false): string {
  if (!iso) return "";
  const d = iso.length <= 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    timeZone: iso.length <= 10 ? "UTC" : "America/Argentina/Buenos_Aires",
  }).format(d);
}

export function monto(n: number | null | undefined, moneda: "USD" | "ARS") {
  const v = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(Number(n ?? 0));
  return moneda === "ARS" ? `$ ${v}` : `USD ${v}`;
}

export function enmascararEmail(e: string | null | undefined) {
  if (!e) return "";
  const [u, d] = e.split("@");
  if (!d) return e;
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, u.length - 2))}@${d}`;
}

export function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
    .map((p) => `${p[0].toUpperCase()}.`)
    .join(" ");
}

/** Estado "efectivo": una reserva sin decisión cuya validez ya pasó se muestra como vencida. */
export function estadoEfectivo(d: Pick<DocEmitido, "estado" | "venceEn" | "tipo">): EstadoDoc {
  if ((d.estado === "emitido" || d.estado === "enviado") && d.tipo === "reserva" && d.venceEn && d.venceEn < hoyAr()) return "vencido";
  return d.estado;
}

export const ETIQUETA_ESTADO: Record<EstadoDoc, string> = {
  emitido: "Emitido",
  enviado: "Pendiente",
  aceptado: "Aceptada",
  rechazado: "Rechazada",
  vencido: "Vencida",
  anulado: "Anulado",
};

/** Texto exacto del consentimiento que acepta el cliente (queda guardado con su decisión). */
export function textoConsentimiento(numero: string, version: number, hash: string | null, decision: "aceptado" | "rechazado") {
  return `Declaro haber leído la reserva inmobiliaria N.º ${numero} (versión ${version}${hash ? `, huella SHA-256 ${hash}` : ""}) y ${
    decision === "aceptado" ? "ACEPTO" : "RECHAZO"
  } sus condiciones. Entiendo que esta constancia electrónica no constituye firma digital.`;
}


/** Texto de honorarios: "3% sobre el monto total de la operación (USD 360)". */
export function textoHonorariosReserva(r: DatosReserva): string | null {
  if (!r.honorariosPct) return null;
  const base = `${String(r.honorariosPct).replace(".", ",")}% sobre el monto total de la operación`;
  return r.valorVenta ? `${base} (${monto((r.valorVenta * r.honorariosPct) / 100, r.monedaVenta)})` : base;
}

export const ETIQUETA_PAGO: Record<"pendiente" | "abonado", string> = { pendiente: "Pago pendiente", abonado: "Abonado" };
