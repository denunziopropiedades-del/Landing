import crypto from "node:crypto";
import { fechaCorta, fechaEnLetras, fechaLarga, importeEnLetras } from "@/lib/pagares/letras";

/**
 * Pagarés de las cuotas (Decreto-Ley 5965/63, arts. 101 y ss.): una cuota por hoja A4,
 * con firma y huella del deudor, espacio para aval y talón de control recortable.
 *
 * Requisitos del art. 101 que cubre cada hoja: la palabra "pagaré" en el texto, la promesa
 * pura y simple de pagar una suma determinada, el vencimiento, el lugar de pago, el
 * beneficiario "o a su orden", lugar y fecha de creación, y la firma del suscriptor.
 * No lleva cláusula de intereses: en un pagaré a día fijo se tiene por no escrita (art. 5).
 */

export type TipoDocBeneficiario = "CUIT" | "CUIL";

export type DatosPagares = {
  beneficiario: { nombre: string; tipoDoc: TipoDocBeneficiario; numeroDoc: string };
  lugarPago: string;
  lugarEmision: string;
  fechaEmision: string; // YYYY-MM-DD
  incluirAval: boolean;
  deudor: {
    nombre: string;
    dni: string | null;
    cuitCuil: string | null;
    domicilio: string | null;
    email: string | null;
    telefono: string | null;
  };
  operacion: {
    proyecto: string | null;
    manzana: string | null;
    lotes: string[];
    totalCuotas: number;
    precio: { importe: number; moneda: "USD" | "ARS" } | null;
    sena: { importe: number; moneda: "USD" | "ARS"; fecha: string | null; comprobante: string | null } | null;
    anticipo: { importe: number; moneda: "USD" | "ARS" } | null;
  };
  cuotas: { id: string; numero: number; monto: number; moneda: "USD" | "ARS"; vencimiento: string }[];
  emisor: string;
};

const NAVY = "#0d2346";
const GRIS = "#555555";
const A4 = { w: 595.28, h: 841.89 };
const M = 36; // margen lateral

const fmtNum = (n: number) => n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtImporte = (n: number, moneda: "USD" | "ARS") => `${moneda === "USD" ? "U$S" : "$"} ${fmtNum(n)}`;

function secreto() {
  return process.env.PAGARES_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "matulotes-dev";
}

/** Código de verificación de cada pagaré: firma (HMAC) de sus datos esenciales. */
export function codigoVerificacion(d: DatosPagares, c: DatosPagares["cuotas"][number]) {
  const base = [c.id, c.numero, c.monto.toFixed(2), c.moneda, c.vencimiento, d.deudor.dni ?? "", d.beneficiario.numeroDoc, d.fechaEmision].join("|");
  const h = crypto.createHmac("sha256", secreto()).update(base).digest("hex").toUpperCase();
  return `${h.slice(0, 4)}-${h.slice(4, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}`;
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generarPagaresPdf(d: DatosPagares): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: false, info: { Title: "Pagarés", Author: d.emisor } });
  const emitidoEl = new Date().toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "short", timeStyle: "short" });

  for (const c of d.cuotas) {
    doc.addPage({ size: "A4", margin: 0 });
    hoja(doc, d, c, emitidoEl);
  }
  return pdfToBuffer(doc);
}

function hoja(doc: PDFKit.PDFDocument, d: DatosPagares, c: DatosPagares["cuotas"][number], emitidoEl: string) {
  const nro = String(c.numero).padStart(4, "0");
  const fx = M, fy = 34, fw = A4.w - 2 * M, fh = 556;
  const ix = fx + 4, iy = fy + 4, iw = fw - 8, ih = fh - 8;
  const px = ix + 22, pw = iw - 44; // área de texto

  // ---- Marco doble + fondo de seguridad (guilloche suave) ----
  doc.save();
  doc.rect(ix, iy, iw, ih).clip();
  doc.lineWidth(0.5).strokeColor(NAVY).strokeOpacity(0.06);
  for (let r = 8; r < 900; r += 7) {
    doc.circle(ix, iy, r).stroke();
    doc.circle(ix + iw, iy + ih, r).stroke();
  }
  doc.restore();
  doc.strokeOpacity(1).lineWidth(2.2).strokeColor(NAVY).rect(fx, fy, fw, fh).stroke();
  doc.lineWidth(0.7).rect(ix, iy, iw, ih).stroke();

  // ---- Encabezado ----
  doc.fillColor(NAVY).font("Times-Bold").fontSize(32).text("P A G A R É", px, iy + 20, { lineBreak: false });
  doc.fillColor("#111111").font("Helvetica").fontSize(9.5)
    .text(`N.º ${nro}  —  Cuota ${c.numero} de ${d.operacion.totalCuotas}`, px, iy + 58, { lineBreak: false });

  const caja = (x: number, w: number, etiqueta: string, valor: string, tam: number) => {
    const y = iy + 20, h = 42;
    doc.save().fillColor("#ffffff").rect(x, y, w, h).fill().restore();
    doc.lineWidth(1.3).strokeColor(NAVY).rect(x, y, w, h).stroke();
    doc.fillColor(NAVY).font("Helvetica").fontSize(6.5).text(etiqueta, x, y + 6, { width: w, align: "center", characterSpacing: 1 });
    doc.fillColor("#111111").font("Times-Bold").fontSize(tam).text(valor, x, y + 17, { width: w, align: "center", lineBreak: false });
  };
  const wMonto = 150, wVenc = 100;
  caja(ix + iw - 22 - wMonto, wMonto, "POR", fmtImporte(c.monto, c.moneda), 15);
  caja(ix + iw - 22 - wMonto - 8 - wVenc, wVenc, "VENCIMIENTO", fechaCorta(c.vencimiento), 12.5);

  // ---- Lugar y fecha de creación ----
  doc.fillColor("#111111").font("Times-Roman").fontSize(11)
    .text(`${d.lugarEmision}, ${fechaLarga(d.fechaEmision)}.`, px, iy + 86, { width: pw, align: "right" });

  // ---- Cuerpo (promesa de pago) ----
  const LG = 5.5;
  const docBenef = d.beneficiario.numeroDoc ? `, ${d.beneficiario.tipoDoc} ${d.beneficiario.numeroDoc},` : ",";
  doc.font("Times-Roman").fontSize(11.5).text("El día ", px, iy + 112, { width: pw, align: "justify", lineGap: LG, continued: true })
    .font("Times-Bold").text(fechaEnLetras(c.vencimiento), { continued: true })
    .font("Times-Roman").text(" ", { continued: true })
    .font("Times-Bold").text("PAGARÉ SIN PROTESTO", { continued: true })
    .font("Times-Roman").text(" (art. 50, Decreto-Ley 5965/63) a ", { continued: true })
    .font("Times-Bold").text(d.beneficiario.nombre.toUpperCase(), { continued: true })
    .font("Times-Roman").text(`${docBenef} o a su orden, la cantidad de:`);

  // Importe en letras, recuadrado
  const letras = importeEnLetras(c.monto, c.moneda);
  doc.font("Times-Bold").fontSize(11);
  const hL = doc.heightOfString(letras, { width: pw - 16 }) + 10;
  const yL = doc.y + 4;
  doc.save().fillColor("#ffffff").rect(px, yL, pw, hL).fill().restore();
  doc.lineWidth(1).strokeColor(NAVY).rect(px, yL, pw, hL).stroke();
  doc.fillColor("#111111").text(letras, px + 8, yL + 5, { width: pw - 16 });

  const enBilletes = c.moneda === "USD" ? "en billetes de dicha moneda, " : "";
  doc.font("Times-Roman").fontSize(11.5)
    .text(`${enBilletes}por igual valor recibido a mi entera satisfacción. Pagadero en `, px, yL + hL + 6, { width: pw, align: "justify", lineGap: LG, continued: true })
    .font("Times-Bold").text(d.lugarPago, { continued: true })
    .font("Times-Roman").text(".");

  if (c.moneda === "USD") {
    doc.moveDown(0.5).fontSize(8.5).font("Times-Bold").text("Moneda de pago. ", px, undefined, { width: pw, align: "justify", continued: true })
      .font("Times-Roman")
      .text("La obligación es de dar moneda extranjera. El suscriptor renuncia a la facultad de liberarse entregando el equivalente en moneda de curso legal (art. 765, Código Civil y Comercial).");
  }

  // ---- Referencia de la operación (informativa) ----
  const op = d.operacion;
  const partesLote = [
    op.manzana ? `Manzana ${op.manzana}` : null,
    op.lotes.length ? `Lote${op.lotes.length > 1 ? "s" : ""} ${op.lotes.join(", ")}` : null,
    op.proyecto,
  ].filter(Boolean).join(" — ");
  const extras = [
    op.precio ? `Precio total: ${fmtImporte(op.precio.importe, op.precio.moneda)}` : null,
    op.sena ? `Reserva/seña abonada: ${fmtImporte(op.sena.importe, op.sena.moneda)}${op.sena.fecha ? ` el ${fechaCorta(op.sena.fecha)}` : ""}${op.sena.comprobante ? ` (${op.sena.comprobante})` : ""}` : null,
    op.anticipo ? `Anticipo: ${fmtImporte(op.anticipo.importe, op.anticipo.moneda)}` : null,
  ].filter(Boolean).join(" · ");
  const ref = `Referencia: cuota ${c.numero} de ${op.totalCuotas} del plan de pagos${partesLote ? ` — ${partesLote}` : ""}.${extras ? ` ${extras}.` : ""} Datos informativos: no condicionan la obligación de pago de este pagaré.`;
  doc.font("Helvetica").fontSize(7.8);
  const yR = doc.y + 10;
  const hR = doc.heightOfString(ref, { width: pw - 16 }) + 10;
  doc.save().fillColor("#ffffff").fillOpacity(0.85).rect(px, yR, pw, hR).fill().restore();
  doc.save().fillColor(NAVY).rect(px, yR, 2.5, hR).fill().restore();
  doc.fillColor("#222222").text(ref, px + 10, yR + 5, { width: pw - 16 });

  // ---- Firmas (posición fija respecto del pie del marco) ----
  const yLinea = iy + ih - 112; // línea de firma
  const wDeudor = d.incluirAval ? pw * 0.58 : pw * 0.7;
  const wHuella = 60, hHuella = 76;
  const xHuella = px + wDeudor - wHuella;
  const wFirma = wDeudor - wHuella - 12;

  doc.fillColor(NAVY).font("Helvetica").fontSize(6).text("HUELLA PULGAR DERECHO", xHuella - 10, yLinea - hHuella - 2, { width: wHuella + 20, align: "center" });
  doc.save().fillColor("#ffffff").roundedRect(xHuella, yLinea - hHuella + 6, wHuella, hHuella, 7).fill().restore();
  doc.lineWidth(1).strokeColor(NAVY).roundedRect(xHuella, yLinea - hHuella + 6, wHuella, hHuella, 7).stroke();

  const bloqueFirma = (x: number, w: number, titulo: string, datos: [string, string][]) => {
    doc.lineWidth(0.8).strokeColor("#111111").moveTo(x, yLinea).lineTo(x + w, yLinea).stroke();
    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(7.5).text(titulo, x, yLinea + 4, { width: w, align: "center" });
    let y = yLinea + 22;
    for (const [k, v] of datos) {
      doc.font("Helvetica").fontSize(7.8).fillColor(GRIS).text(`${k}: `, x, y, { width: w, continued: true, lineBreak: false })
        .fillColor("#111111").text(v || " ", { lineBreak: false, ellipsis: true, width: w });
      doc.lineWidth(0.4).strokeColor("#999999").dash(1, { space: 1.5 }).moveTo(x, y + 10).lineTo(x + w, y + 10).stroke().undash();
      y += 15;
    }
  };

  const de = d.deudor;
  bloqueFirma(px, wFirma + 12 + wHuella, "FIRMA DEL SUSCRIPTOR (DEUDOR)", [
    ["Aclaración", de.nombre.toUpperCase()],
    ["DNI", [de.dni, de.cuitCuil ? `   CUIT/CUIL: ${de.cuitCuil}` : ""].filter(Boolean).join("")],
    ["Domicilio", de.domicilio ?? ""],
    ["E-mail", [de.email, de.telefono ? `   Tel.: ${de.telefono}` : ""].filter(Boolean).join("")],
  ]);
  if (d.incluirAval) {
    const xA = px + wDeudor + 22;
    bloqueFirma(xA, px + pw - xA, "POR AVAL (CODEUDOR / GARANTE)", [
      ["Aclaración", ""],
      ["DNI", ""],
      ["Domicilio", ""],
      ["E-mail", ""],
    ]);
  }

  // ---- Código de verificación ----
  const yV = iy + ih - 18;
  doc.lineWidth(0.4).strokeColor(NAVY).strokeOpacity(0.35).moveTo(px, yV - 5).lineTo(px + pw, yV - 5).stroke().strokeOpacity(1);
  doc.fillColor("#444444").font("Courier").fontSize(7)
    .text(`CÓDIGO DE VERIFICACIÓN: ${codigoVerificacion(d, c)}`, px, yV, { lineBreak: false });
  doc.text(`Emitido ${emitidoEl}`, px, yV, { width: pw, align: "right", lineBreak: false });

  // ---- Línea de corte + talón de control ----
  const yC = fy + fh + 20;
  doc.lineWidth(0.8).strokeColor("#888888").dash(4, { space: 3 }).moveTo(M, yC).lineTo(A4.w - M, yC).stroke().undash();
  const etiquetaCorte = "cortar por la línea — talón de control para la administración";
  doc.font("Helvetica").fontSize(6.5);
  const wEt = doc.widthOfString(etiquetaCorte) + 12;
  doc.save().fillColor("#ffffff").rect((A4.w - wEt) / 2, yC - 5, wEt, 10).fill().restore();
  doc.fillColor("#666666").text(etiquetaCorte, (A4.w - wEt) / 2, yC - 3, { width: wEt, align: "center", lineBreak: false });

  const tx = M, ty = yC + 16, tw = A4.w - 2 * M, th = 112;
  doc.lineWidth(0.7).strokeColor("#bbbbbb").rect(tx, ty, tw, th).stroke();
  doc.fillColor(NAVY).font("Helvetica-Bold").fontSize(8.5).text(`TALÓN DE CONTROL — PAGARÉ N.º ${nro}`, tx + 12, ty + 10, { characterSpacing: 0.6 });
  const col = (tw - 24) / 3;
  const celdas: [string, string][] = [
    ["Deudor", `${de.nombre}${de.dni ? ` — DNI ${de.dni}` : ""}`],
    ["Lote", partesLote || "—"],
    ["Cuota", `${c.numero} de ${op.totalCuotas}`],
    ["Vencimiento", fechaCorta(c.vencimiento)],
    ["Importe", fmtImporte(c.monto, c.moneda)],
    ["Beneficiario", d.beneficiario.nombre],
    ["Firmado el", "____ / ____ / ________"],
    ["Recibido por", "______________________"],
    ["Estado", ""],
  ];
  celdas.forEach(([k, v], i) => {
    const x = tx + 12 + (i % 3) * col;
    const y = ty + 28 + Math.floor(i / 3) * 27;
    doc.fillColor("#777777").font("Helvetica").fontSize(6).text(k.toUpperCase(), x, y, { width: col - 10, characterSpacing: 0.4 });
    if (k === "Estado") {
      let xx = x;
      for (const op of ["Pendiente", "Pagado", "Devuelto"]) {
        doc.lineWidth(0.6).strokeColor("#333333").rect(xx, y + 9, 7, 7).stroke();
        doc.fillColor("#111111").fontSize(7.5).text(op, xx + 10, y + 9, { lineBreak: false });
        xx += doc.widthOfString(op) + 22;
      }
    } else {
      doc.fillColor("#111111").fontSize(7.8).text(v, x, y + 8, { width: col - 10, height: 18, ellipsis: true });
    }
  });

  // ---- Pie ----
  doc.fillColor("#666666").font("Helvetica").fontSize(6.8)
    .text(d.emisor, M, A4.h - 34, { width: A4.w - 2 * M, align: "center" });
}
