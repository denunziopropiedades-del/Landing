import { fechaCorta, formatoMonto, nombrePeriodo, type ContratoAlq, type CuotaAlq, type LiquidacionAlq, type PersonaAlq } from "@/lib/alquileres";

const EMISOR = "DE NUNZIO NEGOCIOS INMOBILIARIOS";
const MATRICULA = "Matías De Nunzio · Martillero Público y Corredor Inmobiliario · Matrícula COL 7886";

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

async function nuevoDoc(titulo: string, subtitulo: string) {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.fontSize(16).fillColor("#0f1b2d").font("Helvetica-Bold").text(EMISOR);
  doc.fontSize(8.5).fillColor("#555555").font("Helvetica").text(MATRICULA);
  doc.text("WhatsApp: 11-2742-4512 · 11-6136-5523");
  doc.moveDown(0.8);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#6cc72f").lineWidth(2).stroke();
  doc.moveDown(0.8);
  doc.fontSize(15).fillColor("#0f1b2d").font("Helvetica-Bold").text(titulo);
  doc.fontSize(10).fillColor("#333333").font("Helvetica").text(subtitulo);
  doc.moveDown(1);
  return doc;
}

function fila(doc: PDFKit.PDFDocument, etiqueta: string, valor: string, negrita = false) {
  const y = doc.y;
  doc.fontSize(10.5).fillColor("#333333").font("Helvetica").text(etiqueta, 50, y, { width: 330 });
  doc.font(negrita ? "Helvetica-Bold" : "Helvetica").text(valor, 380, y, { width: 165, align: "right" });
  doc.moveDown(0.35);
}

/** Recibo de pago del alquiler de un mes. */
export async function generarReciboAlquilerPdf(d: {
  cuota: CuotaAlq;
  contrato: ContratoAlq;
  inquilino: PersonaAlq;
  propietario: PersonaAlq;
}): Promise<Buffer> {
  const { cuota, contrato, inquilino, propietario } = d;
  const doc = await nuevoDoc(
    `Recibo N° ${String(cuota.reciboNumero ?? 0).padStart(6, "0")}`,
    `Fecha de pago: ${fechaCorta(cuota.pagadoEn)}`
  );
  const m = contrato.moneda;
  doc.fontSize(10.5).fillColor("#333333").font("Helvetica");
  doc.text(`Recibimos de ${inquilino.nombre}${inquilino.dni ? ` (DNI ${inquilino.dni})` : ""}`);
  doc.text(`la suma de ${formatoMonto(cuota.pagadoMonto ?? 0, m)} en concepto de alquiler de ${nombrePeriodo(cuota.periodo)}`);
  doc.text(`del inmueble ubicado en ${contrato.direccion}${contrato.localidad ? `, ${contrato.localidad}` : ""},`);
  doc.text(`propiedad de ${propietario.nombre}, por cuenta y orden del locador.`);
  doc.moveDown(1);
  fila(doc, `Alquiler ${nombrePeriodo(cuota.periodo)}`, formatoMonto(cuota.monto, m));
  if (cuota.extras) fila(doc, cuota.extrasDetalle || "Expensas / otros", formatoMonto(cuota.extras, m));
  const punit = Math.max(0, (cuota.pagadoMonto ?? 0) - cuota.monto - cuota.extras);
  if (punit > 0.009) fila(doc, "Intereses por mora", formatoMonto(punit, m));
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").lineWidth(1).stroke();
  doc.moveDown(0.4);
  fila(doc, "TOTAL ABONADO", formatoMonto(cuota.pagadoMonto ?? 0, m), true);
  doc.moveDown(0.6);
  const medio = cuota.medioPago === "mercadopago" ? "Mercado Pago" : cuota.medioPago === "transferencia" ? "Transferencia" : "Efectivo";
  doc.fontSize(9.5).fillColor("#555555").text(`Medio de pago: ${medio} · Vencimiento del período: ${fechaCorta(cuota.vencimiento)}`);
  if (cuota.notas) doc.text(`Observaciones: ${cuota.notas}`);
  doc.moveDown(3);
  doc.fontSize(9).fillColor("#888888").text("Documento emitido electrónicamente por la administración. No válido como factura.", { align: "center" });
  return pdfToBuffer(doc);
}

/** Liquidación al propietario: cobrado, comisión, gastos y neto a rendir. */
export async function generarLiquidacionPdf(d: {
  liquidacion: LiquidacionAlq;
  contrato: ContratoAlq;
  propietario: PersonaAlq;
  inquilino: PersonaAlq;
  cuotas: CuotaAlq[];
}): Promise<Buffer> {
  const { liquidacion: l, contrato, propietario, inquilino, cuotas } = d;
  const m = contrato.moneda;
  const doc = await nuevoDoc("Liquidación al propietario", `Emitida el ${fechaCorta(l.creadoEn.slice(0, 10))}`);
  doc.fontSize(10.5).fillColor("#333333").font("Helvetica");
  doc.text(`Propietario: ${propietario.nombre}${propietario.cuit ? ` · CUIT ${propietario.cuit}` : propietario.dni ? ` · DNI ${propietario.dni}` : ""}`);
  doc.text(`Inmueble: ${contrato.direccion}${contrato.localidad ? `, ${contrato.localidad}` : ""}`);
  doc.text(`Inquilino: ${inquilino.nombre}`);
  if (propietario.cbuAlias) doc.text(`Cuenta para transferir: ${propietario.cbuAlias}`);
  doc.moveDown(1);
  doc.font("Helvetica-Bold").text("Cobros incluidos");
  doc.font("Helvetica").moveDown(0.3);
  for (const c of cuotas) fila(doc, `${nombrePeriodo(c.periodo)} (cobrado el ${fechaCorta(c.pagadoEn)})`, formatoMonto(c.pagadoMonto ?? 0, m));
  doc.moveDown(0.4);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#dddddd").lineWidth(1).stroke();
  doc.moveDown(0.4);
  fila(doc, "Total cobrado", formatoMonto(l.cobrado, m));
  fila(doc, `Comisión de administración (${contrato.comisionAdminPct}%)`, `− ${formatoMonto(l.comision, m)}`);
  if (l.gastos) fila(doc, `Gastos${l.gastosDetalle ? `: ${l.gastosDetalle}` : ""}`, `− ${formatoMonto(l.gastos, m)}`);
  doc.moveDown(0.3);
  fila(doc, "NETO A RENDIR AL PROPIETARIO", formatoMonto(l.neto, m), true);
  doc.moveDown(0.8);
  doc.fontSize(9.5).fillColor("#555555");
  doc.text(l.pagadaEn ? `Pagada el ${fechaCorta(l.pagadaEn)}${l.medioPago ? ` (${l.medioPago})` : ""}.` : "Pendiente de pago al propietario.");
  if (l.notas) doc.text(l.notas);
  return pdfToBuffer(doc);
}
