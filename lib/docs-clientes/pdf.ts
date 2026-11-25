import QRCode from "qrcode";
import {
  INSTITUCION,
  NOMBRE_TIPO,
  fechaAr,
  monto,
  sitio,
  textoHonorariosAutorizacion,
  textoHonorariosReserva,
  type DatosAutorizacionVenta,
  type DatosLibreDeuda,
  type DatosReserva,
  type DocEmitido,
} from "@/lib/docs-clientes/core";

/* Estilo "notarial clásico": letra de imprenta, doble marco azul y dorado, sello de matrícula y firmas. */
const AZUL = "#13284f";
const DORADO = "#a8894b";
const GRIS = "#6b7280";
const TEXTO = "#1f2937";
const LINEA_SUAVE = "#eceef2";
const CELESTE = "#c9d4ea";

const PAG_ANCHO = 595.28;
const PAG_ALTO = 841.89;
const IZQ = 60;
const ANCHO = 475;
const DER = IZQ + ANCHO;
const CENTRO = PAG_ANCHO / 2;
const LIMITE = PAG_ALTO - 70; // hasta dónde puede llegar el contenido (deja lugar al pie)

type Doc = PDFKit.PDFDocument;

function aBuffer(doc: Doc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

function asegurarEspacio(doc: Doc, alto: number) {
  if (doc.y + alto > LIMITE) doc.addPage();
}

const matriculaCorta = () => INSTITUCION.matricula.replace(/^Matrícula\s*/i, ""); // "COL 7886"

/* ───────── Importe en letras ───────── */

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function menorMil(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const r = n % 100;
  let s = CENTENAS[c];
  if (r) {
    const dec = r < 30 ? UNIDADES[r] : DECENAS[Math.floor(r / 10)] + (r % 10 ? ` y ${UNIDADES[r % 10]}` : "");
    s = s ? `${s} ${dec}` : dec;
  }
  return s;
}

/** Entero a palabras ("uno" se apocopa a "un" delante de "mil" y "millones"). */
function enPalabras(n: number): string {
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const apocope = (s: string) => s.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocope(enPalabras(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "mil" : `${apocope(menorMil(miles))} mil`);
  if (resto) partes.push(menorMil(resto));
  return partes.join(" ");
}

/** "Pesos doscientos mil con 00/100" · "Dólares estadounidenses cuatro mil doscientos con 00/100". */
function montoEnLetras(n: number, moneda: "USD" | "ARS"): string {
  const entero = Math.floor(Math.abs(n));
  const centavos = Math.round((Math.abs(n) - entero) * 100);
  const nombre = moneda === "ARS" ? "Pesos" : "Dólares estadounidenses";
  return `${nombre} ${enPalabras(entero)} con ${String(centavos).padStart(2, "0")}/100`;
}

const ORDINALES = ["PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "OCTAVA", "NOVENA", "DÉCIMA", "DÉCIMA PRIMERA", "DÉCIMA SEGUNDA"];

function fechaLarga(iso: string): string {
  const d = iso.length <= 10 ? new Date(`${iso}T12:00:00Z`) : new Date(iso);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

/* ───────── Bloques ───────── */

function marco(doc: Doc) {
  doc.rect(28, 28, PAG_ANCHO - 56, PAG_ALTO - 56).lineWidth(1.4).strokeColor(AZUL).stroke();
  doc.rect(33, 33, PAG_ANCHO - 66, PAG_ALTO - 66).lineWidth(0.5).strokeColor(DORADO).stroke();
}

function centrado(doc: Doc, texto: string, y: number, font: string, size: number, color: string, espaciado = 0) {
  doc.font(font).fontSize(size).fillColor(color);
  const w = doc.widthOfString(texto, { characterSpacing: espaciado });
  doc.text(texto, CENTRO - w / 2, y, { characterSpacing: espaciado, lineBreak: false });
}

function encabezado(doc: Doc, d: DocEmitido) {
  centrado(doc, "INMOBILIARIA", 56, "Times-Roman", 9, DORADO, 3);
  centrado(doc, "DE NUNZIO", 68, "Times-Bold", 28, AZUL, 1);
  centrado(doc, "NEGOCIOS INMOBILIARIOS", 100, "Times-Roman", 9, AZUL, 3);
  doc.moveTo(200, 116).lineTo(395, 116).lineWidth(0.6).strokeColor(DORADO).stroke();
  centrado(doc, `${INSTITUCION.titular} · ${INSTITUCION.titulo} · ${INSTITUCION.matricula}`, 123, "Times-Italic", 9, GRIS);

  const titulo = d.tipo === "reserva" ? "COMPROBANTE DE SEÑA" : NOMBRE_TIPO[d.tipo].toUpperCase();
  centrado(doc, titulo, 152, "Times-Bold", 15, AZUL, 2.5);
  centrado(doc, `N.º ${d.numero}  ·  Emitido el ${fechaLarga(d.emitidoEn)}`, 174, "Times-Roman", 10, GRIS);
  doc.x = IZQ;
  doc.y = 202;
}

function titulo(doc: Doc, texto: string) {
  asegurarEspacio(doc, 50);
  const y = doc.y;
  doc.font("Times-Bold").fontSize(11).fillColor(AZUL).text(texto.toUpperCase(), IZQ, y, { characterSpacing: 1.5, lineBreak: false });
  doc.moveTo(IZQ, y + 16).lineTo(DER, y + 16).lineWidth(0.6).strokeColor(DORADO).stroke();
  doc.x = IZQ;
  doc.y = y + 24;
}

function fila(doc: Doc, etiqueta: string, valor: string, negrita = true) {
  const v = valor || "—";
  doc.font(negrita ? "Times-Bold" : "Times-Roman").fontSize(10);
  const alto = Math.max(doc.heightOfString(v, { width: 315 }), 12) + 6;
  asegurarEspacio(doc, alto);
  const y = doc.y;
  doc.font("Times-Roman").fontSize(10).fillColor(GRIS).text(etiqueta, IZQ, y, { width: 150 });
  doc.font(negrita ? "Times-Bold" : "Times-Roman").fontSize(10).fillColor(TEXTO).text(v, IZQ + 160, y, { width: 315 });
  doc.moveTo(IZQ, y + alto - 2).lineTo(DER, y + alto - 2).lineWidth(0.5).strokeColor(LINEA_SUAVE).stroke();
  doc.x = IZQ;
  doc.y = y + alto;
}

function finTabla(doc: Doc) {
  doc.y += 10;
}

function parrafos(doc: Doc, texto: string, ordinales: boolean) {
  const lista = texto
    .split(/\n{2,}|\r\n\r\n/)
    .map((p) => p.trim().replace(/\s*\n\s*/g, " "))
    .filter(Boolean);
  lista.forEach((p, i) => {
    const prefijo = ordinales ? `${ORDINALES[i] ?? String(i + 1)}. ` : "";
    doc.font("Times-Roman").fontSize(9.6);
    asegurarEspacio(doc, doc.heightOfString(prefijo + p, { width: ANCHO, lineGap: 3 }) + 4);
    const y = doc.y;
    if (prefijo) {
      doc.font("Times-Bold").fillColor(AZUL).text(prefijo, IZQ, y, { continued: true, width: ANCHO, align: "justify", lineGap: 3 });
      doc.font("Times-Roman").fillColor(TEXTO).text(p, { width: ANCHO, align: "justify", lineGap: 3 });
    } else {
      doc.font("Times-Roman").fillColor(TEXTO).text(p, IZQ, y, { width: ANCHO, align: "justify", lineGap: 3 });
    }
    doc.x = IZQ;
    doc.y += 4;
  });
}

/** Recuadro "SON $ 200.000 | Pesos doscientos mil con 00/100". */
function recuadroImporte(doc: Doc, importe: number, moneda: "USD" | "ARS") {
  asegurarEspacio(doc, 66);
  const y = doc.y;
  doc.rect(IZQ, y, ANCHO, 46).lineWidth(1).strokeColor(AZUL).stroke();
  doc.rect(IZQ, y, 150, 46).fill(AZUL);
  doc.font("Times-Roman").fontSize(8).fillColor(CELESTE);
  const wSon = doc.widthOfString("SON", { characterSpacing: 2 });
  doc.text("SON", IZQ + 75 - wSon / 2, y + 9, { characterSpacing: 2, lineBreak: false });
  const importeTxt = monto(importe, moneda);
  doc.font("Times-Bold").fontSize(15).fillColor("#ffffff");
  doc.text(importeTxt, IZQ + 75 - doc.widthOfString(importeTxt) / 2, y + 21, { lineBreak: false });
  doc
    .font("Times-Italic")
    .fontSize(11.5)
    .fillColor(AZUL)
    .text(montoEnLetras(importe, moneda), IZQ + 165, y + 9, { width: ANCHO - 175, height: 32, ellipsis: true });
  doc.x = IZQ;
  doc.y = y + 66;
}

/**
 * Sello circular de matrícula: triple aro azul, leyenda curva
 * "DE NUNZIO • NEGOCIOS INMOBILIARIOS •" y al centro "MAT. / 7886".
 */
function sello(doc: Doc, cx: number, cy: number) {
  doc.save();
  doc.circle(cx, cy, 46).lineWidth(1.8).strokeColor(AZUL).stroke();
  doc.circle(cx, cy, 43).lineWidth(0.5).strokeColor(AZUL).stroke();
  doc.circle(cx, cy, 30).lineWidth(0.9).strokeColor(AZUL).stroke();

  // Leyenda curva: cada letra se rota alrededor del centro; "DE NUNZIO" queda centrado arriba.
  const arriba = "DE NUNZIO";
  const leyenda = `${arriba} • NEGOCIOS INMOBILIARIOS • `;
  const size = 7.4;
  const r = 34;
  doc.font("Times-Bold").fontSize(size).fillColor(AZUL);
  const letras = Array.from(leyenda);
  const anchos = letras.map((ch) => doc.widthOfString(ch));
  const extra = (2 * Math.PI * r - anchos.reduce((a, b) => a + b, 0)) / letras.length;
  const largoNombre = Array.from(arriba).length;
  let ang = -anchos.slice(0, largoNombre).reduce((a, w) => a + w + extra, 0) / r / 2;
  letras.forEach((ch, i) => {
    const a = ang + anchos[i] / 2 / r;
    doc.save();
    doc.rotate((a * 180) / Math.PI, { origin: [cx, cy] });
    doc.text(ch, cx - anchos[i] / 2, cy - r - size * 0.68, { lineBreak: false });
    doc.restore();
    ang += (anchos[i] + extra) / r;
  });

  // Centro
  const medio = (t: string, y: number, font: string, s: number) => {
    doc.font(font).fontSize(s);
    doc.text(t, cx - doc.widthOfString(t) / 2, y, { lineBreak: false });
  };
  medio("MAT.", cy - 13.5, "Times-Bold", 7.2);
  doc.moveTo(cx - 16, cy - 5).lineTo(cx + 16, cy - 5).lineWidth(0.5).strokeColor(AZUL).stroke();
  medio(matriculaCorta().replace(/\D/g, "") || matriculaCorta(), cy - 1, "Times-Bold", 15);
  doc.restore();
}

/** Líneas de firma con el sello de matrícula en el medio. */
function firmas(doc: Doc, izquierda: string, derecha: string) {
  asegurarEspacio(doc, 118);
  doc.y += 70;
  const y = doc.y;
  doc.lineWidth(0.6).strokeColor(GRIS);
  if (izquierda) doc.moveTo(80, y).lineTo(235, y).stroke();
  doc.moveTo(360, y).lineTo(515, y).stroke();
  doc.font("Times-Roman").fontSize(8.5).fillColor(GRIS);
  if (izquierda) doc.text(izquierda, 70, y + 5, { width: 175, align: "center" });
  doc.text(derecha, 350, y + 5, { width: 175, align: "center" });
  sello(doc, CENTRO, y - 18);
  doc.x = IZQ;
  doc.y = y + 40;
}

function pies(doc: Doc) {
  const rango = doc.bufferedPageRange();
  for (let i = rango.start; i < rango.start + rango.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0; // el pie va dentro del margen: evita que pdfkit agregue una página
    marco(doc);
    doc.font("Times-Roman").fontSize(7.6).fillColor(GRIS);
    const pie = `WhatsApp ${INSTITUCION.whatsapp.join(" / ")} · ${sitio().replace(/^https?:\/\//, "")} · ${INSTITUCION.leyenda}`;
    doc.text(pie, CENTRO - doc.widthOfString(pie) / 2, PAG_ALTO - 52, { lineBreak: false });
    if (rango.count > 1) doc.text(`${i - rango.start + 1}/${rango.count}`, DER - 30, PAG_ALTO - 52, { width: 30, align: "right", lineBreak: false });
  }
}

/** Genera el PDF definitivo de una reserva o certificado, con QR de verificación. */
export async function generarPdfDocumento(d: DocEmitido): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: PAG_ALTO - LIMITE, left: IZQ, right: PAG_ANCHO - DER },
    bufferPages: true,
    info: {
      Title: `${NOMBRE_TIPO[d.tipo]} ${d.numero}`,
      Author: INSTITUCION.nombre,
      Subject: `${NOMBRE_TIPO[d.tipo]} N.º ${d.numero}`,
      CreationDate: new Date(d.emitidoEn),
    },
  });

  encabezado(doc, d);
  const firmaInmobiliaria = `${INSTITUCION.titular} · ${matriculaCorta()}`;

  if (d.tipo === "reserva") {
    const r = d.datos as DatosReserva;
    const constancia =
      `Se deja constancia de la reserva efectuada por ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, ` +
      `por la suma de ${montoEnLetras(r.importeReserva, r.monedaReserva).toUpperCase()} (${monto(r.importeReserva, r.monedaReserva)}) ` +
      `en concepto de seña a cuenta de precio por el inmueble ${r.inmueble}` +
      (r.valorVenta ? `, cuyo valor de venta se fija en ${monto(r.valorVenta, r.monedaVenta)}.` : ".");
    doc.font("Times-Roman").fontSize(11).fillColor(TEXTO).text(constancia, IZQ, doc.y, { width: ANCHO, align: "justify", lineGap: 4 });
    doc.y += 12;

    recuadroImporte(doc, r.importeReserva, r.monedaReserva);

    titulo(doc, "Datos de la operación");
    if (d.clienteEmail) fila(doc, "Email del cliente", d.clienteEmail, false);
    if (d.clienteTelefono) fila(doc, "Teléfono del cliente", d.clienteTelefono, false);
    if (r.valorVenta && r.monedaVenta === r.monedaReserva) fila(doc, "Saldo de precio", monto(r.valorVenta - r.importeReserva, r.monedaVenta));
    if (r.formaPagoSaldo) fila(doc, "Forma de pago del saldo", r.formaPagoSaldo);
    const hon = textoHonorariosReserva(r);
    if (hon) fila(doc, "Honorarios profesionales", hon);
    if (d.venceEn) fila(doc, "Validez de la reserva", `Hasta el ${fechaAr(d.venceEn)}`);
    finTabla(doc);

    titulo(doc, "Condiciones");
    parrafos(doc, r.condiciones, true);

    firmas(doc, `${d.clienteNombre}${d.clienteDni ? ` · DNI ${d.clienteDni}` : ""}`, firmaInmobiliaria);
  } else if (d.tipo === "autorizacion_venta") {
    const a = d.datos as DatosAutorizacionVenta;
    titulo(doc, "Propietario");
    fila(doc, "Nombre y apellido", d.clienteNombre);
    if (d.clienteDni) fila(doc, "DNI", d.clienteDni, false);
    if (d.clienteEmail) fila(doc, "Email", d.clienteEmail, false);
    if (d.clienteTelefono) fila(doc, "Teléfono", d.clienteTelefono, false);
    if (a.domicilioPropietario) fila(doc, "Domicilio", a.domicilioPropietario, false);
    finTabla(doc);

    titulo(doc, "Inmueble y condiciones");
    fila(doc, "Inmueble", a.inmueble);
    if (a.valorTasacion) fila(doc, "Valor de tasación", monto(a.valorTasacion, a.moneda), false);
    fila(doc, "Precio de venta", monto(a.precio, a.moneda));
    fila(doc, "Modalidad", a.exclusiva ? "Autorización exclusiva" : "Autorización sin exclusividad", false);
    fila(doc, "Plazo", `${a.plazoDias} días corridos${d.venceEn ? `, hasta el ${fechaAr(d.venceEn)}` : ""}`, false);
    fila(doc, "Honorarios (parte vendedora)", textoHonorariosAutorizacion(a), false);
    finTabla(doc);

    titulo(doc, "Cláusulas");
    parrafos(doc, a.clausulas, false);

    firmas(doc, `${d.clienteNombre} · Propietario`, firmaInmobiliaria);
  } else {
    const ld = d.datos as DatosLibreDeuda;
    titulo(doc, "Certificación");
    const texto =
      ld.origen === "lote"
        ? ld.cancelacionTotal
          ? `Por medio del presente se certifica que ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, ha cancelado la totalidad de las cuotas de su plan de financiación correspondiente a ${ld.inmueble}, no registrando deuda alguna con esta inmobiliaria por dicho concepto.`
          : `Por medio del presente se certifica que ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, titular de ${ld.inmueble}, no registra cuotas vencidas impagas de su plan de financiación al ${fechaAr(ld.alDia)}.`
        : `Por medio del presente se certifica que ${d.clienteNombre}${d.clienteDni ? `, DNI ${d.clienteDni}` : ""}, en su carácter de inquilino del inmueble ubicado en ${ld.inmueble}, no registra alquileres vencidos impagos al ${fechaAr(ld.alDia)}.`;
    parrafos(doc, texto, false);
    if (ld.detalle.length) {
      titulo(doc, "Detalle");
      for (const r of ld.detalle) parrafos(doc, `•  ${r}`, false);
    }
    parrafos(doc, "Se extiende el presente a pedido del interesado, para ser presentado ante quien corresponda.", false);
    firmas(doc, "", firmaInmobiliaria);
  }

  // Verificación con QR, al pie de la última página
  const url = `${sitio()}/verificar/${d.codigoVerificacion}`;
  const qr = await QRCode.toBuffer(url, { type: "png", errorCorrectionLevel: "M", margin: 1, width: 260, color: { dark: AZUL, light: "#ffffff" } });
  const ALTO_QR = 86;
  if (doc.y + ALTO_QR + 10 > LIMITE) doc.addPage();
  const yQr = Math.max(doc.y + 10, LIMITE - ALTO_QR);
  doc.moveTo(IZQ, yQr).lineTo(DER, yQr).lineWidth(0.6).strokeColor(DORADO).stroke();
  doc.image(qr, IZQ, yQr + 10, { width: 62, height: 62 });
  const xt = IZQ + 76;
  doc.font("Times-Bold").fontSize(10).fillColor(AZUL).text("Verificación de autenticidad", xt, yQr + 13, { lineBreak: false });
  doc
    .font("Times-Roman")
    .fontSize(9.5)
    .fillColor(GRIS)
    .text(`${url.replace(/^https?:\/\//, "")}  ·  Código ${d.codigoVerificacion}`, xt, yQr + 29, { width: ANCHO - 76, link: url, lineBreak: false });
  const nota =
    d.aceptaHabilitada && d.tipo !== "libre_deuda"
      ? `Aceptación electrónica del ${d.tipo === "reserva" ? "cliente" : "propietario"} desde su enlace privado con código de un solo uso; queda constancia de fecha, hora y huella del documento. No constituye firma digital.`
      : "La verificación muestra el número, tipo, fecha y estado del documento, sin datos personales.";
  doc.font("Times-Italic").fontSize(8.5).fillColor(GRIS).text(nota, xt, yQr + 45, { width: ANCHO - 76 });

  pies(doc);
  return aBuffer(doc);
}
