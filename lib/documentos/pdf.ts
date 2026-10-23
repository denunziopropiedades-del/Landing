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
    doc.y += 8;
  }

  return pdfToBuffer(doc);
}

type Parte = { t: string; negrita: boolean; ancho: number };
type Palabra = { partes: Parte[]; ancho: number; espacio: number };

/**
 * Escribe un párrafo armando los renglones a mano (pdfkit corta mal cuando se mezclan
 * negrita y texto normal en la misma línea). Justifica todas las líneas menos la última.
 */
function escribirLinea(
  doc: PDFKit.PDFDocument,
  linea: string,
  o: { ancho: number; interlineado: number; alinear: "left" | "center" | "justify"; sangria: number }
) {
  const TAM = 12;
  const alto = TAM + o.interlineado;
  const medir = (t: string, negrita: boolean) => doc.font(negrita ? "Times-Bold" : "Times-Roman").fontSize(TAM).widthOfString(t);

  // 1) Palabras (una palabra puede mezclar negrita y normal, ej. “PÉREZ”)
  const palabras: Palabra[] = [];
  let actual: Parte[] = [];
  const cerrar = (espacio: number) => {
    if (actual.length) palabras.push({ partes: actual, ancho: actual.reduce((a, p) => a + p.ancho, 0), espacio });
    actual = [];
  };
  for (const tramo of linea.split(/(\*\*[^*]+\*\*)/g)) {
    if (!tramo) continue;
    const negrita = /^\*\*[^*]+\*\*$/.test(tramo);
    const txt = negrita ? tramo.slice(2, -2) : tramo;
    for (const tok of txt.split(/(\s+)/)) {
      if (!tok) continue;
      if (/^\s+$/.test(tok)) cerrar(medir(" ", negrita));
      else actual.push({ t: tok, negrita, ancho: medir(tok, negrita) });
    }
  }
  cerrar(0);
  if (palabras.length === 0) {
    doc.y += alto * 0.5;
    return;
  }

  // 2) Renglones
  const renglones: Palabra[][] = [];
  let r: Palabra[] = [];
  let usado = 0;
  for (const w of palabras) {
    const disponible = o.ancho - (renglones.length === 0 ? o.sangria : 0);
    const sep = r.length ? r[r.length - 1].espacio : 0;
    if (r.length && usado + sep + w.ancho > disponible) {
      renglones.push(r);
      r = [];
      usado = 0;
    }
    usado += (r.length ? r[r.length - 1].espacio : 0) + w.ancho;
    r.push(w);
  }
  if (r.length) renglones.push(r);

  // 3) Dibujo
  const izq = doc.page.margins.left;
  let y = doc.y;
  renglones.forEach((ren, idx) => {
    if (y + alto > doc.page.height - doc.page.margins.bottom) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    const sangria = idx === 0 ? o.sangria : 0;
    const disponible = o.ancho - sangria;
    const natural = ren.reduce((acc, w, i) => acc + w.ancho + (i < ren.length - 1 ? w.espacio : 0), 0);
    const huecos = ren.length - 1;
    const justificar = o.alinear === "justify" && idx < renglones.length - 1 && huecos > 0;
    const extra = justificar ? Math.max(0, disponible - natural) / huecos : 0;
    let x = izq + sangria + (o.alinear === "center" ? (disponible - natural) / 2 : 0);
    ren.forEach((w, i) => {
      for (const p of w.partes) {
        doc.font(p.negrita ? "Times-Bold" : "Times-Roman").fontSize(TAM).text(p.t, x, y, { lineBreak: false });
        x += p.ancho;
      }
      if (i < ren.length - 1) x += w.espacio + extra;
    });
    y += alto;
  });
  doc.font("Times-Roman").fontSize(TAM);
  doc.x = izq;
  doc.y = y;
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
