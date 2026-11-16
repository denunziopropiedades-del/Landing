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

export type TipoDoc = "reserva" | "libre_deuda" | "autorizacion_venta";
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

/** Tasación y autorización de venta: el propietario la acepta online con código de un solo uso. */
export type DatosAutorizacionVenta = {
  inmueble: string;
  domicilioPropietario: string | null;
  /** Precio de venta pretendido. */
  precio: number;
  moneda: "USD" | "ARS";
  /** Valor central de la tasación que respalda el precio (si la hubo). */
  valorTasacion: number | null;
  plazoDias: number;
  exclusiva: boolean;
  /** Honorarios a cargo del vendedor: % sobre el precio de venta. */
  honorariosPct: number;
  clausulas: string;
  tasacionId: string | null;
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
  datos: DatosReserva | DatosLibreDeuda | DatosAutorizacionVenta;
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
  /** N.º de operación del pago (Mercado Pago o el que se cargó a mano). */
  pagoMpId?: string | null;
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
  pagoMpId: r.pago_mp_id ?? null,
});

/* ───────── Varios ───────── */

export const PREFIJO: Record<TipoDoc, string> = { reserva: "RES", libre_deuda: "LD", autorizacion_venta: "AV" };
export const NOMBRE_TIPO: Record<TipoDoc, string> = {
  reserva: "Reserva inmobiliaria",
  libre_deuda: "Certificado de libre deuda",
  autorizacion_venta: "Tasación y autorización de venta",
};

/** "la reserva inmobiliaria" / "la autorización de venta": para armar textos de mails y pantallas. */
export const NOMBRE_CORTO: Record<TipoDoc, string> = {
  reserva: "reserva inmobiliaria",
  libre_deuda: "certificado de libre deuda",
  autorizacion_venta: "autorización de venta",
};

/** Tipos de documento que el cliente puede aceptar o rechazar online. */
export const admiteDecision = (tipo: TipoDoc) => tipo === "reserva" || tipo === "autorizacion_venta";

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

/** Estado "efectivo": una reserva o autorización sin decisión cuya validez ya pasó se muestra como vencida. */
export function estadoEfectivo(d: Pick<DocEmitido, "estado" | "venceEn" | "tipo">): EstadoDoc {
  if ((d.estado === "emitido" || d.estado === "enviado") && admiteDecision(d.tipo) && d.venceEn && d.venceEn < hoyAr()) return "vencido";
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
export function textoConsentimiento(
  numero: string,
  version: number,
  hash: string | null,
  decision: "aceptado" | "rechazado",
  tipo: TipoDoc = "reserva"
) {
  return `Declaro haber leído la ${NOMBRE_CORTO[tipo]} N.º ${numero} (versión ${version}${hash ? `, huella SHA-256 ${hash}` : ""}) y ${
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

/* ───────── Autorización de venta ───────── */

/** "3% sobre el precio de venta (USD 3.600)". */
export function textoHonorariosAutorizacion(a: DatosAutorizacionVenta): string {
  const base = `${String(a.honorariosPct).replace(".", ",")}% sobre el precio de venta`;
  return a.precio ? `${base} (${monto((a.precio * a.honorariosPct) / 100, a.moneda)})` : base;
}

/** Cláusulas modelo de la autorización de venta. Se pueden editar antes de emitir cada contrato. */
export function clausulasAutorizacion(o: { exclusiva: boolean; plazoDias: number; honorariosPct: number }): string {
  const pct = String(o.honorariosPct).replace(".", ",");
  return [
    `PRIMERA – Objeto. El propietario autoriza a ${INSTITUCION.nombre}, a cargo de ${INSTITUCION.titular}, ${INSTITUCION.titulo}, ${INSTITUCION.matricula} (en adelante, "la inmobiliaria"), a ofrecer en venta el inmueble identificado en este documento, ${
      o.exclusiva ? "con carácter exclusivo" : "sin exclusividad"
    }, por el precio y en las condiciones aquí indicadas.`,
    `SEGUNDA – Tasación y precio. La inmobiliaria realizó la tasación del inmueble según su ubicación, superficie, estado y valores comparables de la zona. El precio de venta es el indicado en este documento y solo puede modificarse con la conformidad escrita del propietario. La inmobiliaria informará al propietario toda oferta que reciba, aunque sea por un precio menor.`,
    `TERCERA – Plazo. La autorización rige por ${o.plazoDias} días corridos contados desde la fecha de emisión de este documento. Vencido el plazo puede renovarse por acuerdo escrito de las partes.`,
    o.exclusiva
      ? `CUARTA – Exclusividad. Durante el plazo de la autorización el propietario se compromete a no vender el inmueble por su cuenta ni a través de otro corredor o intermediario, y a derivar a la inmobiliaria a todo interesado que lo contacte directamente. Si el inmueble se vende durante ese plazo, cualquiera sea la vía, la inmobiliaria tiene derecho a percibir los honorarios pactados.`
      : `CUARTA – Sin exclusividad. El propietario puede ofrecer el inmueble por su cuenta o a través de otros corredores. La inmobiliaria tiene derecho a los honorarios pactados cuando la venta se concrete con un interesado presentado por ella.`,
    `QUINTA – Honorarios. El propietario abonará a la inmobiliaria, en concepto de honorarios profesionales, el ${pct}% del precio de venta, exigible al firmarse el boleto de compraventa o la escritura traslativa de dominio, lo que ocurra primero. Los honorarios se deben también cuando, dentro de los 180 días posteriores al vencimiento de esta autorización, el inmueble se venda a una persona que lo haya conocido por intermedio de la inmobiliaria. Los honorarios de la parte compradora están a cargo de esta y no se descuentan del precio.`,
    `SEXTA – Obligaciones de la inmobiliaria. La inmobiliaria publicará el inmueble en su sitio web, portales y redes sociales, coordinará y acompañará las visitas, asesorará al propietario durante la negociación y colaborará con la reunión de la documentación necesaria para la escrituración.`,
    `SÉPTIMA – Reservas. La inmobiliaria queda autorizada a recibir reservas de compra ad referéndum del propietario, quien deberá aceptarlas o rechazarlas dentro del plazo que en cada reserva se indique. La reserva no aceptada se devuelve al interesado.`,
    `OCTAVA – Declaraciones del propietario. El propietario declara ser titular del inmueble o estar legitimado para disponer de él, que los datos informados son exactos y que el inmueble no reconoce embargos, hipotecas, inhibiciones, ocupantes ni deudas distintas de las que hubiera informado por escrito a la inmobiliaria. Se compromete a entregar copia del título de propiedad, planos y comprobantes de impuestos y servicios, y a permitir las visitas en días y horarios a coordinar.`,
    `NOVENA – Domicilios y jurisdicción. Las partes constituyen domicilio en los indicados en este documento y aceptan como válidas las comunicaciones cursadas al correo electrónico y al teléfono allí informados. Para cualquier divergencia se someten a los tribunales ordinarios del Departamento Judicial La Plata.`,
    `DÉCIMA – Aceptación electrónica. El propietario acepta esta autorización desde su enlace privado, previa verificación de su identidad con un código de un solo uso enviado a su correo electrónico. Queda constancia de la fecha, la hora y la huella del documento aceptado.`,
  ].join("\n\n");
}
