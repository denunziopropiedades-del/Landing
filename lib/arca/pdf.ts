import QRCode from "qrcode";
import type { ConfigArca } from "@/lib/arca/config";
import { CONDICIONES_IVA, DOC_TIPOS, type Factura } from "@/lib/arca/facturas";

const NEGRO = "#1a1a1a";
const DORADO = "#EF9F27";
const DORADO_OSCURO = "#BA7517";
const DORADO_CLARO = "#FAC775";
const CREMA = "#FAEEDA";
const MARRON = "#412402";
const GRIS = "#5F5E5A";
const GRIS_CLARO = "#888780";
const LINEA = "#D3D1C7";

const fechaAr = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const pad = (n: number, l: number) => String(n).padStart(l, "0");
const cuitFmt = (v: string) => {
  const d = v.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : v;
};
const docFmt = (tipo: number, nro: string) =>
  tipo === 99 ? "" : tipo === 96 ? `DNI ${Number(nro.replace(/\D/g, "")).toLocaleString("es-AR")}` : `${DOC_TIPOS[tipo] ?? "Doc."} ${cuitFmt(nro)}`;

function dinero(v: number, moneda: "PES" | "DOL") {
  const t = v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return moneda === "DOL" ? `US$ ${t}` : `$ ${t}`;
}

/** URL del QR que exige ARCA (RG 4892). */
export function urlQrArca(f: Factura, config: ConfigArca) {
  const datos = {
    ver: 1,
    fecha: f.fecha,
    cuit: Number(config.cuit),
    ptoVta: f.puntoVenta,
    tipoCmp: f.tipoCbte,
    nroCmp: f.numero ?? 0,
    importe: Number(f.importeTotal.toFixed(2)),
    moneda: f.moneda,
    ctz: Number(f.cotizacion.toFixed(6)),
    tipoDocRec: f.receptorDocTipo,
    nroDocRec: Number(f.receptorDocNro.replace(/\D/g, "") || 0),
    tipoCodAut: "E",
    codAut: Number(f.cae ?? 0),
  };
  return `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(datos)).toString("base64")}`;
}

/** PDF de la factura (modelo negro y dorado). */
export async function generarFacturaPdf(f: Factura, config: ConfigArca): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const fin = new Promise<Buffer>((res, rej) => {
    doc.on("end", () => res(Buffer.concat(chunks)));
    doc.on("error", rej);
  });

  const W = 595.28;
  const M = 36;
  const ancho = W - M * 2;
  const esNC = f.tipoCbte === 13;
  const usd = f.moneda === "DOL";
  const autorizada = f.estado === "autorizada" && !!f.cae;
  const nro = f.numero ? `${pad(f.puntoVenta, 5)}-${pad(f.numero, 8)}` : `${pad(f.puntoVenta, 5)}-________`;

  // ---------- Cabecera ----------
  doc.rect(0, 0, W, 96).fill(NEGRO);
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#ffffff").text("MATULOTES", M, 28, { characterSpacing: 3, lineBreak: false });
  doc.font("Helvetica").fontSize(7.5).fillColor(DORADO).text(config.nombreFantasia.toUpperCase(), M, 56, { characterSpacing: 1.8, lineBreak: false });

  // Letra C arriba y al centro (RG 1415).
  const bx = W / 2 - 28;
  doc.rect(bx, 18, 56, 56).lineWidth(1).stroke(DORADO);
  doc.font("Helvetica-Bold").fontSize(30).fillColor(DORADO).text("C", bx, 25, { width: 56, align: "center" });
  doc.font("Helvetica").fontSize(7.5).fillColor(DORADO).text(`Cód. ${esNC ? "013" : "011"}`, bx, 59, { width: 56, align: "center" });

  doc.font("Helvetica").fontSize(esNC ? 13 : 17).fillColor("#ffffff").text(esNC ? "NOTA DE CRÉDITO" : "FACTURA", W / 2 + 40, 26, {
    width: W / 2 - 40 - M,
    align: "right",
    characterSpacing: esNC ? 1.5 : 4,
  });
  doc.font("Helvetica").fontSize(9).fillColor("#B4B2A9").text(`N° ${nro}`, W / 2 + 40, 52, { width: W / 2 - 40 - M, align: "right" });
  doc.text(`Fecha de emisión: ${fechaAr(f.fecha)}`, W / 2 + 40, 65, { width: W / 2 - 40 - M, align: "right" });
  doc.rect(0, 96, W, 3).fill(DORADO);

  let y = 99;
  if (usd) {
    doc.rect(0, y, W, 20).fill(CREMA);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MARRON).text("Moneda: dólares estadounidenses (US$)", M, y + 6, { lineBreak: false });
    doc.text(`Cancela en la misma moneda: ${f.cancelaMismaMoneda ? "sí" : "no"}`, M, y + 6, { width: ancho, align: "right" });
    y += 20;
  }

  if (f.entorno === "homologacion") {
    doc.rect(0, y, W, 16).fill("#FCEBEB");
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#A32D2D").text("COMPROBANTE DE PRUEBA (HOMOLOGACIÓN) — SIN VALIDEZ FISCAL", 0, y + 4.5, {
      width: W,
      align: "center",
    });
    y += 16;
  }

  // ---------- Emisor / Cliente ----------
  y += 16;
  const col = (ancho - 24) / 2;
  const x2 = M + col + 24;
  const titulo = (t: string, x: number) => doc.font("Helvetica-Bold").fontSize(7.5).fillColor(DORADO_OSCURO).text(t, x, y, { characterSpacing: 1.5 });
  titulo("EMISOR", M);
  titulo("CLIENTE", x2);

  const linea = (t: string, x: number, yy: number, bold = false) => {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 10 : 8.5).fillColor(bold ? NEGRO : GRIS).text(t, x, yy, { width: col });
    return doc.y + 1;
  };

  let ye = y + 13;
  ye = linea(config.razonSocial, M, ye, true);
  ye = linea(config.matricula, M, ye);
  ye = linea(`CUIT ${cuitFmt(config.cuit)} · ${config.condicionIva}`, M, ye);
  ye = linea(`Ingresos Brutos: ${config.iibb || "—"} · Inicio de actividades: ${fechaAr(config.inicioActividades)}`, M, ye);
  ye = linea(`Domicilio comercial: ${config.domicilio || "—"}`, M, ye);

  let yc = y + 13;
  yc = linea(f.receptorNombre, x2, yc, true);
  const doc1 = docFmt(f.receptorDocTipo, f.receptorDocNro);
  if (doc1) yc = linea(doc1, x2, yc);
  yc = linea(`Condición frente al IVA: ${CONDICIONES_IVA[f.receptorCondicionIva] ?? "—"}`, x2, yc);
  if (f.receptorDomicilio) yc = linea(`Domicilio: ${f.receptorDomicilio}`, x2, yc);
  yc = linea(`Condición de venta: ${f.medioPago ? f.medioPago.charAt(0).toUpperCase() + f.medioPago.slice(1) : "Contado"}`, x2, yc);
  yc = linea(`Período: ${fechaAr(f.periodoDesde ?? f.fecha)} al ${fechaAr(f.periodoHasta ?? f.fecha)} · Vto. pago: ${fechaAr(f.vtoPago ?? f.fecha)}`, x2, yc);

  y = Math.max(ye, yc) + 8;

  if (f.receptorCondicionIva === 5) {
    doc.rect(M, y, ancho, 18).lineWidth(0.6).stroke(DORADO_CLARO);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MARRON).text("A CONSUMIDOR FINAL", M, y + 5.5, { width: ancho, align: "center", characterSpacing: 2 });
    y += 26;
  }

  // ---------- Detalle ----------
  const cDesc = ancho - 50 - 110;
  doc.rect(M, y, ancho, 20).fill(NEGRO);
  doc.font("Helvetica-Bold").fontSize(7.5).fillColor(DORADO_CLARO);
  doc.text("DESCRIPCIÓN", M + 10, y + 7, { characterSpacing: 1.2, lineBreak: false });
  doc.text("CANT.", M + cDesc, y + 7, { width: 50, align: "right", characterSpacing: 1.2 });
  doc.text(usd ? "IMPORTE US$" : "IMPORTE", M + cDesc + 50, y + 7, { width: 100, align: "right", characterSpacing: 1.2 });
  y += 26;

  for (const it of f.items) {
    const inicio = y;
    doc.font("Helvetica-Bold").fontSize(9.5).fillColor(NEGRO).text(it.descripcion, M + 10, y, { width: cDesc - 20 });
    let yy = doc.y;
    if (it.detalle) {
      doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text(it.detalle, M + 10, yy + 1, { width: cDesc - 20 });
      yy = doc.y;
    }
    doc.font("Helvetica").fontSize(9.5).fillColor(NEGRO).text(String(it.cantidad), M + cDesc, inicio, { width: 50, align: "right" });
    doc.text(dinero(it.cantidad * it.precio, f.moneda), M + cDesc + 50, inicio, { width: 100, align: "right" });
    y = Math.max(yy, inicio + 12) + 8;
    doc.moveTo(M, y - 4).lineTo(M + ancho, y - 4).lineWidth(0.5).stroke(LINEA);
  }

  // ---------- Totales ----------
  y += 8;
  const anchoTot = 230;
  const xt = M + ancho - anchoTot;
  if (usd && !autorizada) {
    doc.rect(M, y, 3, 28).fill(DORADO);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MARRON).text("Tipo de cambio: se informa al emitir", M + 10, y + 2, { width: ancho - anchoTot - 30 });
    doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text("BNA vendedor divisa del día hábil anterior (lo informa ARCA)", M + 10, doc.y + 1, { width: ancho - anchoTot - 30 });
  } else if (usd) {
    doc.rect(M, y, 3, 40).fill(DORADO);
    doc.font("Helvetica-Bold").fontSize(8.5).fillColor(MARRON).text(`Tipo de cambio utilizado: $ ${f.cotizacion.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`, M + 10, y + 2, { width: ancho - anchoTot - 30 });
    doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text(`BNA vendedor divisa${f.cotizacionFecha ? ` del ${fechaAr(`${f.cotizacionFecha.slice(0, 4)}-${f.cotizacionFecha.slice(4, 6)}-${f.cotizacionFecha.slice(6, 8)}`)}` : ""} (informado por ARCA)`, M + 10, doc.y + 1, { width: ancho - anchoTot - 30 });
    doc.text(`Equivalente informativo: ${dinero(f.importeTotal * f.cotizacion, "PES")}`, M + 10, doc.y + 1, { width: ancho - anchoTot - 30 });
  }
  doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text("Subtotal", xt + 12, y + 2, { lineBreak: false });
  doc.text(dinero(f.importeTotal, f.moneda), xt, y + 2, { width: anchoTot - 12, align: "right" });
  doc.rect(xt, y + 16, anchoTot, 28).fill(NEGRO);
  doc.font("Helvetica").fontSize(8).fillColor(DORADO).text("TOTAL", xt + 12, y + 26, { characterSpacing: 1.5, lineBreak: false });
  doc.font("Helvetica-Bold").fontSize(14).fillColor(DORADO).text(dinero(f.importeTotal, f.moneda), xt, y + 23, { width: anchoTot - 12, align: "right" });
  y += 58;

  // ---------- Autorización ARCA ----------
  const alto = 78;
  doc.rect(M, y, ancho, alto).lineWidth(0.5).stroke(LINEA);
  if (autorizada) {
    const qr = await QRCode.toBuffer(urlQrArca(f, config), { margin: 0, width: 220, errorCorrectionLevel: "M" });
    doc.image(qr, M + 10, y + 9, { width: 60, height: 60 });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(MARRON).text("Comprobante autorizado · ARCA", M + 82, y + 18, { width: ancho - 270 });
  } else {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#A32D2D").text("Comprobante NO autorizado (borrador)", M + 12, y + 18, { width: ancho - 200 });
  }
  doc.font("Helvetica").fontSize(7.5).fillColor(GRIS_CLARO).text(
    "Esta agencia no se responsabiliza por los datos ingresados en el detalle de la operación.",
    M + (autorizada ? 82 : 12),
    y + 34,
    { width: ancho - 290 }
  );
  doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text("CAE N°", M + ancho - 190, y + 18, { width: 178, align: "right" });
  doc.font("Helvetica-Bold").fontSize(11).fillColor(MARRON).text(f.cae ?? "—", M + ancho - 190, y + 30, { width: 178, align: "right" });
  doc.font("Helvetica").fontSize(8.5).fillColor(GRIS).text(`Vto. CAE: ${fechaAr(f.caeVto)}`, M + ancho - 190, y + 46, { width: 178, align: "right" });

  // ---------- Pie ----------
  const H = 841.89;
  doc.rect(0, H - 30, W, 30).fill(NEGRO);
  doc.font("Helvetica").fontSize(8).fillColor("#B4B2A9").text(config.web, M, H - 19, { lineBreak: false });
  doc.text(config.telefonos, M, H - 19, { width: ancho, align: "right" });

  doc.end();
  return fin;
}
