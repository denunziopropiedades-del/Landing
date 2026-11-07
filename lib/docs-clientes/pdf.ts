import QRCode from "qrcode";
import {
  INSTITUCION,
  NOMBRE_TIPO,
  fechaAr,
  monto,
  sitio,
  type DatosLibreDeuda,
  type DatosReserva,
  type DocEmitido,
} from "@/lib/docs-clientes/core";

const AZUL = "#0f1b2d";
const VERDE = "#6cc72f";
const GRIS = "#555555";
const TEXTO = "#222222";
const ANCHO = 495; // A4 con márgenes de 50

function aBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function seccion(doc: PDFKit.PDFDocument, titulo: string) {
  doc.moveDown(0.6);
  doc.fontSize(11).fillColor(AZUL).font("Helvetica-Bold").text(titulo.toUpperCase(), 50, doc.y, { characterSpacing: 0.5 });
  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#dddddd").lineWidth(0.8).stroke();
  doc.moveDown(0.5);
}

function fila(doc: PDFKit.PDFDocument, etiqueta: string, valor: string, negrita = false) {
  const y = doc.y;
  doc.fontSize(10.5).fillColor(GRIS).font("Helvetica").text(etiqueta, 50, y, { width: 170 });
  const alto1 = doc.y - y;
  doc.fillColor(TEXTO).font(negrita ? "Helvetica-Bold" : "Helvetica").text(valor || "—", 225, y, { width: 320 });
  const alto2 = doc.y - y;
  doc.y = y + Math.max(alto1, alto2) + 4;
  doc.x = 50;
}

function parrafo(doc: PDFKit.PDFDocument, texto: string) {
  doc.fontSize(10.5).fillColor(TEXTO).font("Helvetica").text(texto, 50, doc.y, { width: ANCHO, align: "justify", lineGap: 2 });
  doc.moveDown(0.5);
}

/** Genera el PDF definitivo de una reserva o certificado, con QR de verificación. */
export async function generarPdfDocumento(d: DocEmitido): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: {
      Title: `${NOMBRE_TIPO[d.tipo]} ${d.numero}`,
      Author: INSTITUCION.nombre,
      Subject: `${NOMBRE_TIPO[d.tipo]} N.º ${d.numero}`,
      CreationDate: new Date(d.emitidoEn),
    },
  });

  // Encabezado institucional
  doc.rect(0, 0, 595.28, 92).fill(AZUL);
  doc.fillColor(VERDE).font("Helvetica-Bold").fontSize(8.5).text("DE NUNZIO", 50, 26, { characterSpacing: 2 });
  doc.fillColor("#ffffff").fontSize(17).text("NEGOCIOS INMOBILIARIOS", 50, 38);
  doc
    .fillColor("#c9d2e3")
    .font("Helvetica")
    .fontSize(8.5)
    .text(`${INSTITUCION.titular} · ${INSTITUCION.titulo} · ${INSTITUCION.matricula}`, 50, 60)
    .text(`WhatsApp: ${INSTITUCION.whatsapp.join(" / ")}`, 50, 72);
  doc.y = 116;
  doc.x = 50;

  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(18).text(NOMBRE_TIPO[d.tipo], 50, doc.y);
  doc.fillColor(GRIS).font("Helvetica").fontSize(10.5).text(`N.º ${d.numero}  ·  Emitido el ${fechaAr(d.emitidoEn)}`);
  doc.moveDown(0.4);

  seccion(doc, d.tipo === "reserva" ? "Datos del cliente" : "Titular");
  fila(doc, "Nombre y apellido", d.clienteNombre, true);
  if (d.clienteDni) fila(doc, "DNI", d.clienteDni);
  if (d.tipo === "reserva") {
    if (d.clienteEmail) fila(doc, "Email", d.clienteEmail);
    if (d.clienteTelefono) fila(doc, "Teléfono", d.clienteTelefono);
  }

  if (d.tipo === "reserva") {
    const r = d.datos as DatosReserva;
    seccion(doc, "Datos de la operación");
    fila(doc, "Inmueble", r.inmueble, true);
    if (r.valorVenta) fila(doc, "Valor de venta", monto(r.valorVenta, r.monedaVenta));
    fila(doc, "Importe de la reserva", monto(r.importeReserva, r.monedaReserva), true);
    if (r.valorVenta && r.monedaVenta === r.monedaReserva) fila(doc, "Saldo de precio", monto(r.valorVenta - r.importeReserva, r.monedaVenta));
    if (r.formaPagoSaldo) fila(doc, "Forma de pago del saldo", r.formaPagoSaldo);
    if (d.venceEn) fila(doc, "Validez de la reserva", `Hasta el ${fechaAr(d.venceEn)}`);

    seccion(doc, "Condiciones");
    for (const p of r.condiciones.split(/\n{2,}|\r\n\r\n/)) if (p.trim()) parrafo(doc, p.trim().replace(/\s*\n\s*/g, " "));

    if (d.aceptaHabilitada) {
      doc.moveDown(0.2);
      doc
        .roundedRect(50, doc.y, ANCHO, 46, 6)
        .fillAndStroke("#f4f7fb", "#d5dce8");
      const y = doc.y + 9;
      doc
        .fillColor(AZUL)
        .font("Helvetica-Bold")
        .fontSize(9.5)
        .text("Aceptación del cliente", 62, y)
        .font("Helvetica")
        .fillColor(GRIS)
        .fontSize(8.5)
        .text(
          "El cliente puede aceptar o rechazar estas condiciones desde su enlace privado, previa verificación con un código de un solo uso. Queda constancia electrónica de la decisión (fecha, hora y huella del documento). Este procedimiento no constituye firma digital.",
          62,
          y + 12,
          { width: ANCHO - 24 }
        );
      doc.y = y + 46;
    }
  } else {
    const ld = d.datos as DatosLibreDeuda;
    seccion(doc, "Certificación");
    const texto =
      ld.origen === "lote"
        ? ld.cancelacionTotal
          ? `Por medio del presente se certifica que ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, ha cancelado la totalidad de las cuotas de su plan de financiación correspondiente a ${ld.inmueble}, no registrando deuda alguna con esta inmobiliaria por dicho concepto.`
          : `Por medio del presente se certifica que ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, titular de ${ld.inmueble}, no registra cuotas vencidas impagas de su plan de financiación al ${fechaAr(ld.alDia)}.`
        : `Por medio del presente se certifica que ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, en su carácter de inquilino del inmueble ubicado en ${ld.inmueble}, no registra alquileres vencidos impagos al ${fechaAr(ld.alDia)}.`;
    parrafo(doc, texto);
    if (ld.detalle.length) {
      seccion(doc, "Detalle");
      for (const r of ld.detalle) parrafo(doc, `•  ${r}`);
    }
    parrafo(doc, "Se extiende el presente a pedido del interesado, para ser presentado ante quien corresponda.");
  }

  // Bloque de verificación con QR
  const url = `${sitio()}/verificar/${d.codigoVerificacion}`;
  const qr = await QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 260 });
  if (doc.y > 650) doc.addPage();
  doc.y = Math.max(doc.y + 14, 640);
  const yQr = doc.y;
  doc.roundedRect(50, yQr, ANCHO, 112, 8).fillAndStroke("#ffffff", "#d5dce8");
  doc.image(qr, 60, yQr + 10, { width: 92, height: 92 });
  doc
    .fillColor(AZUL)
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .text("Verificación de autenticidad", 166, yQr + 14)
    .font("Helvetica")
    .fillColor(GRIS)
    .fontSize(8.8)
    .text("Escaneá el código QR o ingresá a:", 166, yQr + 31)
    .fillColor(AZUL)
    .text(url, 166, yQr + 43, { width: 370, link: url, underline: true })
    .fillColor(GRIS)
    .text(`Código de verificación: `, 166, yQr + 60, { continued: true })
    .font("Helvetica-Bold")
    .fillColor(TEXTO)
    .text(d.codigoVerificacion)
    .font("Helvetica")
    .fillColor(GRIS)
    .fontSize(7.8)
    .text(
      "La verificación muestra el número, tipo, fecha y estado del documento, sin datos personales del cliente.",
      166,
      yQr + 76,
      { width: 370 }
    );

  doc.page.margins.bottom = 0; // el pie va dentro del margen: evita que pdfkit agregue una página
  doc
    .fontSize(7.8)
    .fillColor("#888888")
    .text(
      `${INSTITUCION.nombre} · ${INSTITUCION.titulo} · ${INSTITUCION.matricula} · ${INSTITUCION.leyenda}`,
      50,
      790,
      { width: ANCHO, align: "center", lineBreak: false }
    );

  return aBuffer(doc);
}
