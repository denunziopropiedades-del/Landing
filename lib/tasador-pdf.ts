import { INSTITUCION, fechaAr } from "@/lib/docs-clientes/compartido";
import { nombrePartido } from "@/lib/zonas";
import {
  TIPOS_TASADOR,
  caracteristicas,
  descripcionInmueble,
  informeEfectivo,
  labelOpcion,
  promedioComparables,
  unitarioComparable,
  usd,
  type Tasacion,
} from "@/lib/tasador";

const AZUL = "#0f1b2d";
const VERDE = "#6cc72f";
const GRIS = "#555555";
const TEXTO = "#222222";
const ANCHO = 495; // A4 con márgenes de 50
const PIE = 770;

function aBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

/** Informe comparativo de tasación en PDF, listo para enviar al propietario. */
export async function generarPdfTasacion(t: Tasacion): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;
  const inf = informeEfectivo(t);
  const inmueble = descripcionInmueble(t);
  const fecha = fechaAr(t.informeAprobadoEn ?? new Date().toISOString());
  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    info: { Title: `Informe de tasación – ${inmueble}`, Author: INSTITUCION.nombre, Subject: "Informe comparativo de tasación" },
  });

  const espacio = (alto: number) => {
    if (doc.y + alto > PIE) {
      doc.addPage();
      doc.y = 50;
    }
  };
  const seccion = (titulo: string) => {
    espacio(60);
    doc.moveDown(0.7);
    doc.fontSize(11).fillColor(AZUL).font("Helvetica-Bold").text(titulo.toUpperCase(), 50, doc.y, { characterSpacing: 0.5 });
    doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#dddddd").lineWidth(0.8).stroke();
    doc.moveDown(0.5);
  };
  const fila = (etiqueta: string, valor: string, negrita = false) => {
    espacio(30);
    const y = doc.y;
    doc.fontSize(10.5).fillColor(GRIS).font("Helvetica").text(etiqueta, 50, y, { width: 170 });
    const alto1 = doc.y - y;
    doc.fillColor(TEXTO).font(negrita ? "Helvetica-Bold" : "Helvetica").text(valor || "—", 225, y, { width: 320 });
    doc.y = y + Math.max(alto1, doc.y - y) + 4;
    doc.x = 50;
  };
  const parrafo = (texto: string, tamano = 10.5) => {
    espacio(40);
    doc.fontSize(tamano).fillColor(TEXTO).font("Helvetica").text(texto, 50, doc.y, { width: ANCHO, align: "justify", lineGap: 2 });
    doc.moveDown(0.5);
  };
  /** Tabla simple: anchos en puntos, alineación por columna. */
  const tabla = (encabezados: string[], filas: string[][], anchos: number[], derecha: number[] = []) => {
    const dibujar = (celdas: string[], cabecera: boolean) => {
      doc.fontSize(9).font(cabecera ? "Helvetica-Bold" : "Helvetica");
      const alto = Math.max(...celdas.map((c, i) => doc.heightOfString(c, { width: anchos[i] - 10 }))) + 9;
      espacio(alto + 4);
      const y = doc.y;
      if (cabecera) doc.rect(50, y, ANCHO, alto).fill(AZUL);
      let x = 50;
      celdas.forEach((c, i) => {
        doc.fillColor(cabecera ? "#ffffff" : TEXTO).text(c, x + 5, y + 5, { width: anchos[i] - 10, align: derecha.includes(i) ? "right" : "left" });
        x += anchos[i];
      });
      if (!cabecera) doc.moveTo(50, y + alto).lineTo(545, y + alto).strokeColor("#e3e7ef").lineWidth(0.6).stroke();
      doc.y = y + alto;
      doc.x = 50;
    };
    dibujar(encabezados, true);
    for (const f of filas) dibujar(f, false);
    doc.moveDown(0.6);
  };

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

  doc.fillColor(AZUL).font("Helvetica-Bold").fontSize(18).text("Informe de tasación", 50, doc.y);
  doc.fillColor(GRIS).font("Helvetica").fontSize(10.5).text(`Estudio comparativo de mercado  ·  ${fecha}`);

  seccion("Identificación del inmueble");
  fila("Inmueble", inmueble, true);
  fila("Tipo", labelOpcion(TIPOS_TASADOR, t.tipo));
  fila("Partido", nombrePartido(t.partido));
  if (t.localidad) fila("Localidad / barrio", t.localidad);
  if (t.direccion) fila("Dirección", t.direccion);
  fila("Solicitante", t.nombre);

  seccion("Objeto y alcance");
  parrafo(
    "Este informe estima el valor de mercado del inmueble para su venta, a partir de los datos informados por el solicitante, los valores de referencia de la zona y las ofertas comparables relevadas. No incluye inspección presencial ni estudio de títulos."
  );

  seccion("Características informadas");
  for (const c of caracteristicas(t)) fila(c.etiqueta, c.valor);

  seccion("Metodología y ajustes");
  parrafo(
    `Se aplicó el método comparativo de mercado: se parte del valor unitario de referencia para ${nombrePartido(t.partido)} y se lo ajusta por ubicación, superficie, estado, antigüedad, mejoras y situación documental.`
  );
  if (t.resultado.desglose?.length) {
    tabla(
      ["Concepto", "Detalle", "Importe"],
      t.resultado.desglose.map((r) => [r.concepto, r.detalle, r.importe ? usd(r.importe) : ""]),
      [110, 285, 100],
      [2]
    );
  }

  if (inf.comparables.length) {
    seccion("Propiedades comparables");
    const unidad = t.resultado.unidad;
    tabla(
      ["Comparable", "Precio publicado", `Superficie (${unidad})`, `USD/${unidad}`],
      inf.comparables.map((c) => [
        c.fuente ? `${c.descripcion}\n${c.fuente}` : c.descripcion,
        usd(c.precio),
        c.superficie > 0 ? c.superficie.toLocaleString("es-AR") : "—",
        unitarioComparable(c) > 0 ? usd(Math.round(unitarioComparable(c))) : "—",
      ]),
      [245, 90, 80, 80],
      [1, 2, 3]
    );
    const promedio = promedioComparables(inf.comparables);
    const unitarioFinal = t.resultado.superficie > 0 ? inf.central / t.resultado.superficie : 0;
    if (promedio > 0 && unitarioFinal > 0) {
      const dif = Math.round((unitarioFinal / promedio - 1) * 100);
      fila(`Promedio de comparables`, `${usd(Math.round(promedio))} por ${unidad}`);
      fila(`Valor del inmueble tasado`, `${usd(Math.round(unitarioFinal))} por ${unidad} (${dif >= 0 ? "+" : "−"}${Math.abs(dif)}% respecto del promedio)`, true);
    }
    parrafo("Los comparables son precios de publicación a la fecha del informe, no operaciones cerradas. El valor de cierre suele ubicarse por debajo del precio publicado.", 9);
  }

  seccion("Valor estimado");
  espacio(86);
  const yCaja = doc.y;
  doc.roundedRect(50, yCaja, ANCHO, 74, 8).fill(AZUL);
  const tercio = ANCHO / 3;
  [
    { titulo: "MÍNIMO", valor: usd(inf.minimo), color: "#ffffff" },
    { titulo: "VALOR CENTRAL", valor: usd(inf.central), color: VERDE },
    { titulo: "MÁXIMO", valor: usd(inf.maximo), color: "#ffffff" },
  ].forEach((v, i) => {
    doc.fillColor("#c9d2e3").font("Helvetica").fontSize(8).text(v.titulo, 50 + tercio * i, yCaja + 18, { width: tercio, align: "center", characterSpacing: 1 });
    doc.fillColor(v.color).font("Helvetica-Bold").fontSize(i === 1 ? 20 : 15).text(v.valor, 50 + tercio * i, yCaja + (i === 1 ? 34 : 37), { width: tercio, align: "center" });
  });
  doc.y = yCaja + 86;
  doc.x = 50;
  fila("Precio sugerido de publicación", usd(inf.publicacion), true);
  fila("Rango probable de negociación", `${usd(inf.minimo)} a ${usd(inf.central)}`);
  if (t.resultado.superficie > 0) fila("Valor unitario", `${usd(Math.round(inf.central / t.resultado.superficie))} por ${t.resultado.unidad}`);

  seccion("Honorarios profesionales");
  fila("Parte vendedora (3%)", usd(Math.round(inf.central * 0.03)));
  fila("Parte compradora (3%)", usd(Math.round(inf.central * 0.03)));
  parrafo("Importes estimados sobre el valor central; se calculan sobre el precio final de la operación y no forman parte del valor del inmueble.", 9);

  if (inf.observaciones) {
    seccion("Observaciones");
    for (const p of inf.observaciones.split(/\n{2,}/)) if (p.trim()) parrafo(p.trim().replace(/\s*\n\s*/g, " "));
  }

  seccion("Verificaciones pendientes");
  for (const v of [
    "Título de propiedad, titularidad registral e informe de dominio e inhibiciones.",
    "Plano de mensura, nomenclatura catastral y estado parcelario.",
    "Zonificación y usos permitidos; superficie construida declarada.",
    "Impuestos, tasas y servicios al día.",
    "Inspección presencial del inmueble.",
  ])
    parrafo(`•  ${v}`, 10);

  seccion("Conclusión");
  parrafo(
    `De acuerdo con el análisis realizado, el valor de mercado estimado del inmueble es de ${usd(inf.central)}, dentro de un rango de ${usd(inf.minimo)} a ${usd(inf.maximo)}. Se recomienda publicarlo en ${usd(inf.publicacion)}. Esta tasación es una estimación profesional de valor a la fecha indicada, sujeta a la inspección del inmueble y a la verificación de su documentación; no constituye pericia judicial.`
  );

  espacio(80);
  doc.moveDown(2.2);
  const yFirma = doc.y;
  doc.moveTo(345, yFirma).lineTo(535, yFirma).strokeColor("#888888").lineWidth(0.6).stroke();
  doc.fontSize(9).fillColor(TEXTO).font("Helvetica-Bold").text(INSTITUCION.titular, 345, yFirma + 5, { width: 190, align: "center" });
  doc.font("Helvetica").fillColor(GRIS).fontSize(8.5).text(`${INSTITUCION.titulo}`, 345, doc.y, { width: 190, align: "center" });
  doc.text(INSTITUCION.matricula, 345, doc.y, { width: 190, align: "center" });
  doc.text(fecha, 50, yFirma + 5, { width: 200 });

  return aBuffer(doc);
}
