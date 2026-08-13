function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export type DatosComprobante = {
  nombreCliente: string;
  dni: string;
  email: string;
  telefono: string;
  proyectoNombre: string;
  manzana: string;
  lotes: { numero: string; superficieM2: number }[];
  importeArs: number;
  pagoId: string;
  fecha: Date;
};

/** Genera un comprobante en PDF de la seña pagada, para adjuntar al mail de confirmación. */
export async function generarComprobantePdf(datos: DatosComprobante): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  doc.fontSize(20).fillColor("#0b0f0d").text("Matu Lotes");
  doc.fontSize(14).fillColor("#237046").text("Comprobante de pago de seña");
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .fillColor("#666666")
    .text(`Emitido el ${datos.fecha.toLocaleString("es-AR")}`)
    .text(`N° de operación (Mercado Pago): ${datos.pagoId}`);
  doc.moveDown(1.5);

  doc.fontSize(12).fillColor("#0b0f0d").text("Datos del cliente");
  doc.moveDown(0.4);
  doc
    .fontSize(10)
    .fillColor("#333333")
    .text(`Nombre: ${datos.nombreCliente}`)
    .text(`DNI: ${datos.dni}`)
    .text(`Email: ${datos.email}`)
    .text(`Teléfono: ${datos.telefono}`);
  doc.moveDown(1.2);

  doc.fontSize(12).fillColor("#0b0f0d").text("Datos de la operación");
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#333333").text(`Proyecto: ${datos.proyectoNombre}`).text(`Manzana: ${datos.manzana}`);
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor("#333333").text("Lotes:");
  for (const lote of datos.lotes) {
    doc.text(`  •  Lote ${lote.numero} — ${lote.superficieM2} m²`);
  }
  doc.moveDown(1);

  doc
    .fontSize(13)
    .fillColor("#237046")
    .text(`Importe abonado: $ ${datos.importeArs.toLocaleString("es-AR")}`);

  return pdfToBuffer(doc);
}
