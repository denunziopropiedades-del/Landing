/** Recibo de pago de una cuota (NO es factura: no pasa por ARCA). */

const NAVY = "#0f1b2d";
const VERDE = "#6cc72f";
const VERDE_OSC = "#2f7d16";
const GRIS = "#5F5E5A";
const GRIS_CLARO = "#94a3b8";
const LINEA = "#e2e8f0";

export type DatosReciboCuota = {
  numeroRecibo: string;
  cliente: string;
  dni: string | null;
  proyecto: string | null;
  lotes: string | null;
  cuotaNumero: number;
  vencimiento: string;
  pagadoEn: string;
  moneda: "USD" | "ARS";
  montoPagado: number;
  montoPagadoArs: number | null;
  cotizacion: number | null;
  medioPago: string | null;
  honorario: number | null;
  cuotasPagadas: number;
};

const fecha = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const monto = (v: number, m: "USD" | "ARS") =>
  `${m === "USD" ? "USD" : "$"} ${v.toLocaleString("es-AR", { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;
const medio = (m: string | null) =>
  m === "mercadopago" ? "Mercado Pago" : m === "transferencia" ? "Transferencia" : m === "efectivo" ? "Efectivo" : m ? m.charAt(0).toUpperCase() + m.slice(1) : "—";

export async function generarReciboCuotaPdf(d: DatosReciboCuota): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const fin = new Promise<Buffer>((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });

  const W = 595.28;
  const M = 44;
  const ancho = W - M * 2;

  // Cabecera
  doc.rect(0, 0, W, 92).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff").text("MATULOTES", M, 26, { characterSpacing: 3, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(VERDE).text("DE NUNZIO NEGOCIOS INMOBILIARIOS", M, 52, { characterSpacing: 1.8, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor("#cbd5e1").text("Matías De Nunzio · Martillero Público y Corredor Inmobiliario · Mat. 7886", M, 66, { lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(16).fillColor("#ffffff").text("RECIBO DE PAGO", W / 2, 28, { width: W / 2 - M, align: "right", characterSpacing: 2 });
  doc.font("Helvetica").fontSize(9).fillColor("#cbd5e1").text(`N° ${d.numeroRecibo}`, W / 2, 52, { width: W / 2 - M, align: "right" });
  doc.text(`Fecha de pago: ${fecha(d.pagadoEn)}`, W / 2, 65, { width: W / 2 - M, align: "right" });
  doc.rect(0, 92, W, 3).fill(VERDE);

  // Texto principal
  let y = 124;
  doc.font("Helvetica").fontSize(11).fillColor("#1e293b");
  doc.text(`Recibimos de `, M, y, { continued: true }).font("Helvetica-Bold").text(d.cliente, { continued: true });
  doc.font("Helvetica").text(d.dni ? ` (DNI ${d.dni})` : "", { continued: true });
  doc.text(` la suma de `, { continued: true }).font("Helvetica-Bold").text(monto(d.montoPagado, d.moneda), { continued: true });
  doc.font("Helvetica").text(
    ` en concepto de pago de la cuota N° ${d.cuotaNumero} del plan de financiación${d.lotes ? ` de ${d.lotes}` : ""}${d.proyecto ? ` (${d.proyecto})` : ""}.`,
    { width: ancho, lineGap: 3 }
  );
  y = doc.y + 22;

  // Detalle
  doc.rect(M, y, ancho, 22).fill(NAVY);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(VERDE).text("DETALLE", M + 12, y + 7.5, { characterSpacing: 1.5, lineBreak: false });
  doc.text("IMPORTE", M, y + 7.5, { width: ancho - 12, align: "right", characterSpacing: 1.5 });
  y += 30;

  const fila = (etiqueta: string, valor: string, sub?: string, negrita = false) => {
    doc.font(negrita ? "Helvetica-Bold" : "Helvetica").fontSize(10.5).fillColor("#1e293b").text(etiqueta, M + 12, y, { width: ancho - 160 });
    doc.text(valor, M, y, { width: ancho - 12, align: "right" });
    let yy = y + 14;
    if (sub) {
      doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text(sub, M + 12, yy, { width: ancho - 160 });
      yy = doc.y;
    }
    y = yy + 8;
    doc.moveTo(M, y - 4).lineTo(M + ancho, y - 4).lineWidth(0.5).stroke(LINEA);
  };

  const conDesglose = d.honorario && d.honorario > 0 && d.montoPagado > d.honorario;
  if (conDesglose) {
    fila("Cuota del lote", monto(d.montoPagado - d.honorario!, d.moneda), `Cuota N° ${d.cuotaNumero} · vencimiento ${fecha(d.vencimiento)}`);
    fila("Gestión de cobranza", monto(d.honorario!, d.moneda));
  } else {
    fila(`Cuota N° ${d.cuotaNumero}`, monto(d.montoPagado, d.moneda), `Vencimiento ${fecha(d.vencimiento)}`);
  }

  y += 6;
  const anchoTot = 230;
  doc.rect(M + ancho - anchoTot, y, anchoTot, 30).fill(NAVY);
  doc.font("Helvetica").fontSize(8).fillColor(VERDE).text("TOTAL ABONADO", M + ancho - anchoTot + 12, y + 11, { characterSpacing: 1.5, lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(14).fillColor("#ffffff").text(monto(d.montoPagado, d.moneda), M + ancho - anchoTot, y + 8, { width: anchoTot - 12, align: "right" });
  y += 46;

  // Datos del pago
  doc.font("Helvetica").fontSize(9.5).fillColor(GRIS);
  doc.text(`Medio de pago: ${medio(d.medioPago)}`, M, y);
  if (d.montoPagadoArs && d.moneda === "USD") {
    doc.text(
      `Abonado en pesos: ${monto(d.montoPagadoArs, "ARS")}${d.cotizacion ? ` (cotización $ ${d.cotizacion.toLocaleString("es-AR")})` : ""}`,
      M,
      doc.y + 2
    );
  }
  doc.text(`Cuotas abonadas a la fecha: ${d.cuotasPagadas}`, M, doc.y + 2);

  // Sello de pagado
  const sy = y - 4;
  doc.save();
  doc.rotate(-8, { origin: [M + ancho - 70, sy + 22] });
  doc.roundedRect(M + ancho - 130, sy, 120, 40, 6).lineWidth(2).stroke(VERDE_OSC);
  doc.font("Helvetica-Bold").fontSize(16).fillColor(VERDE_OSC).text("PAGADO", M + ancho - 130, sy + 12, { width: 120, align: "center", characterSpacing: 3 });
  doc.restore();

  // Leyenda y pie
  const H = 841.89;
  doc.font("Helvetica").fontSize(8.5).fillColor(GRIS_CLARO).text(
    "Comprobante de pago emitido electrónicamente. Documento no válido como factura.",
    M,
    H - 78,
    { width: ancho, align: "center" }
  );
  doc.rect(0, H - 30, W, 30).fill(NAVY);
  doc.font("Helvetica").fontSize(8).fillColor("#cbd5e1").text("matulotes.app", M, H - 19, { lineBreak: false });
  doc.text("WhatsApp 11-2742-4512 · 11-6136-5523", M, H - 19, { width: ancho, align: "right" });

  doc.end();
  return fin;
}
