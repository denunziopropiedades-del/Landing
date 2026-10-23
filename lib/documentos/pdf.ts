import PDFDocument from "pdfkit";
import { completar } from "@/lib/documentos/plantillas";

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export type Firma = { nombre: string; detalle: string };

const CM = 28.3465;

/**
 * Arma el PDF de un escrito: hoja A4, márgenes de escrito judicial (4 cm a la izquierda),
 * Times 12, interlineado 1,5, texto justificado, **negritas** y bloque de firma y sello.
 */
export async function generarDocumentoPdf(opts: {
  titulo: string;
  cuerpo: string;
  valores: Record<string, string>;
  firma: Firma;
  comprimir?: boolean;
}): Promise<Buffer> {
  const doc = new PDFDocument({
    compress: opts.comprimir ?? true,
    size: "A4",
    margins: { top: 3 * CM, bottom: 2.5 * CM, left: 4 * CM, right: 2 * CM },
    info: { Title: opts.titulo, Author: opts.firma.nombre || "De Nunzio Negocios Inmobiliarios" },
  });

  const texto = completar(opts.cuerpo, opts.valores).replace(/\r\n/g, "\n");
  const ancho = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const interlineado = 6; // ≈ 1,5 con Times 12

  doc.font("Times-Roman").fontSize(12).fillColor("#000000");

  const parrafos = texto.split(/\n{2,}/);
  for (const parrafo of parrafos) {
    const limpio = parrafo.trim();
    if (!limpio) continue;

    if (limpio === "[FIRMA]") {
      dibujarFirma(doc, opts.firma, ancho);
      continue;
    }

    // Párrafos de una sola línea centrados si están todo en mayúsculas y negrita (fórmulas de cierre).
    const lineas = limpio.split("\n");
    const esFormula = lineas.length === 1 && /^\*\*[^*]+\*\*$/.test(limpio) && limpio === limpio.toUpperCase() && !limpio.endsWith(":**");
    for (let i = 0; i < lineas.length; i++) {
      escribirLinea(doc, lineas[i], {
        ancho,
        interlineado,
        alinear: esFormula ? "center" : lineas.length > 1 ? "left" : "justify",
        sangria: !esFormula && lineas.length === 1 && !/^\*\*/.test(limpio) ? 1.25 * CM : 0,
      });
    }
    doc.moveDown(0.6);
  }

  return pdfToBuffer(doc);
}

function escribirLinea(
  doc: PDFKit.PDFDocument,
  linea: string,
  o: { ancho: number; interlineado: number; alinear: "left" | "center" | "justify"; sangria: number }
) {
  const partes = linea.split(/(\*\*[^*]+\*\*)/g).filter((p) => p !== "");
  if (partes.length === 0) {
    doc.moveDown(0.5);
    return;
  }
  partes.forEach((p, i) => {
    const negrita = /^\*\*[^*]+\*\*$/.test(p);
    doc.font(negrita ? "Times-Bold" : "Times-Roman");
    doc.text(negrita ? p.slice(2, -2) : p, i === 0 ? doc.page.margins.left : undefined, undefined, {
      width: o.ancho,
      align: o.alinear,
      lineGap: o.interlineado,
      indent: i === 0 ? o.sangria : 0,
      continued: i < partes.length - 1,
    });
  });
}

function dibujarFirma(doc: PDFKit.PDFDocument, firma: Firma, ancho: number) {
  const alto = 3.4 * CM;
  if (doc.y + alto > doc.page.height - doc.page.margins.bottom) doc.addPage();
  const anchoBloque = 6.5 * CM;
  const x = doc.page.margins.left + ancho - anchoBloque;
  const y = doc.y + 2 * CM;
  doc.moveTo(x, y).lineTo(x + anchoBloque, y).lineWidth(0.6).strokeColor("#000000").stroke();
  doc.font("Times-Roman").fontSize(10).text("Firma y sello", x, y + 4, { width: anchoBloque, align: "center" });
  if (firma.nombre) doc.font("Times-Bold").fontSize(11).text(firma.nombre, x, undefined, { width: anchoBloque, align: "center" });
  if (firma.detalle) doc.font("Times-Roman").fontSize(10).text(firma.detalle, x, undefined, { width: anchoBloque, align: "center" });
  doc.font("Times-Roman").fontSize(12);
  doc.x = doc.page.margins.left;
}
