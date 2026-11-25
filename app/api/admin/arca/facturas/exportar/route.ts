import ExcelJS from "exceljs";
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { leerConfig } from "@/lib/arca/config";
import { DOC_TIPOS, mapFactura, type Factura } from "@/lib/arca/facturas";

export const runtime = "nodejs";

const ESTADO: Record<string, string> = {
  borrador: "Borrador",
  enviando: "Pendiente ARCA",
  autorizada: "Autorizada",
  rechazada: "Rechazada",
  descartada: "Descartada",
};
const ORIGEN: Record<string, string> = { manual: "Manual", sena: "Seña", honorario_cuota: "Honorario cuota", alquiler: "Alquiler", otro: "Otro" };
const pad = (n: number | null, l: number) => (n == null ? "" : String(n).padStart(l, "0"));
const numero = (f: Factura) => (f.numero ? `${pad(f.puntoVenta, 5)}-${pad(f.numero, 8)}` : "—");
const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");
const signo = (f: Factura) => (f.tipoCbte === 13 ? -1 : 1);
const dinero = (v: number, m: "PES" | "DOL") =>
  `${m === "DOL" ? "US$" : "$"} ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Exporta el listado de facturas (con los mismos filtros del panel) a Excel o PDF. */
export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return new NextResponse("No autorizado", { status: 401 });
  const a = await getSupabaseAdminClient();
  if (!a) return new NextResponse("No disponible", { status: 503 });

  const sp = new URL(request.url).searchParams;
  const formato = sp.get("formato") === "pdf" ? "pdf" : "xlsx";
  const estado = sp.get("estado") ?? "activas";
  const moneda = sp.get("moneda") ?? "";
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const desde = sp.get("desde") ?? "";
  const hasta = sp.get("hasta") ?? "";

  const { data } = await a.from("arca_facturas").select("*").order("fecha", { ascending: true }).order("numero", { ascending: true }).limit(5000);
  const facturas = (data ?? []).map(mapFactura).filter((f) => {
    if (estado === "activas" && f.estado === "descartada") return false;
    if (estado && estado !== "activas" && f.estado !== estado) return false;
    if (moneda && f.moneda !== moneda) return false;
    if (desde && f.fecha < desde) return false;
    if (hasta && f.fecha > hasta) return false;
    if (q && !`${f.receptorNombre} ${f.receptorDocNro} ${numero(f)} ${f.conceptoTipo ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const config = await leerConfig(a);
  const hoy = new Date().toISOString().slice(0, 10);

  const tot = { ars: 0, usd: 0, pesos: 0 };
  for (const f of facturas) {
    if (f.estado !== "autorizada") continue;
    const v = f.importeTotal * signo(f);
    if (f.moneda === "DOL") tot.usd += v;
    else tot.ars += v;
    tot.pesos += f.moneda === "DOL" ? v * f.cotizacion : v;
  }

  if (formato === "xlsx") {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Facturas ARCA");
    ws.columns = [
      { header: "Fecha", key: "fecha", width: 12 },
      { header: "Tipo", key: "tipo", width: 11 },
      { header: "Número", key: "numero", width: 16 },
      { header: "Cliente", key: "cliente", width: 30 },
      { header: "Documento", key: "doc", width: 18 },
      { header: "Concepto", key: "concepto", width: 40 },
      { header: "Detalle", key: "detalle", width: 60 },
      { header: "Moneda", key: "moneda", width: 8 },
      { header: "Total", key: "total", width: 14, style: { numFmt: "#,##0.00" } },
      { header: "Cotización", key: "cot", width: 12, style: { numFmt: "#,##0.00" } },
      { header: "Total en pesos", key: "pesos", width: 16, style: { numFmt: "#,##0.00" } },
      { header: "CAE", key: "cae", width: 16 },
      { header: "Vto. CAE", key: "caeVto", width: 12 },
      { header: "Estado", key: "estado", width: 14 },
      { header: "Origen", key: "origen", width: 16 },
      { header: "Entorno", key: "entorno", width: 12 },
    ];
    for (const f of facturas) {
      ws.addRow({
        fecha: fecha(f.fecha),
        tipo: f.tipoCbte === 13 ? "NC C" : "Factura C",
        numero: numero(f),
        cliente: f.receptorNombre,
        doc: f.receptorDocTipo === 99 ? "Sin identificar" : `${DOC_TIPOS[f.receptorDocTipo] ?? ""} ${f.receptorDocNro}`,
        concepto: f.items.map((i) => i.descripcion).join(" / "),
        detalle: f.items.map((i) => i.detalle).filter(Boolean).join(" / "),
        moneda: f.moneda === "DOL" ? "USD" : "ARS",
        total: f.importeTotal * signo(f),
        cot: f.cotizacion,
        pesos: f.importeTotal * signo(f) * (f.moneda === "DOL" ? f.cotizacion : 1),
        cae: f.cae ?? "",
        caeVto: fecha(f.caeVto),
        estado: ESTADO[f.estado] ?? f.estado,
        origen: ORIGEN[f.origen] ?? f.origen,
        entorno: f.entorno === "produccion" ? "Producción" : "Pruebas",
      });
    }
    const h = ws.getRow(1);
    h.font = { bold: true, color: { argb: "FFFAC775" } };
    h.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A1A" } };
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.addRow({});
    const r1 = ws.addRow({ cliente: "Total autorizado en pesos", total: tot.ars });
    const r2 = ws.addRow({ cliente: "Total autorizado en dólares", total: tot.usd });
    const r3 = ws.addRow({ cliente: "Total convertido a pesos", pesos: tot.pesos });
    [r1, r2, r3].forEach((r) => (r.font = { bold: true }));
    const buf = await wb.xlsx.writeBuffer();
    return new NextResponse(new Uint8Array(buf as ArrayBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="facturas-arca-${hoy}.xlsx"`,
        "Cache-Control": "private, no-store",
      },
    });
  }

  // ---------- PDF (A4 horizontal) ----------
  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 30 });
  const chunks: Buffer[] = [];
  doc.on("data", (c) => chunks.push(c));
  const fin = new Promise<Buffer>((res) => doc.on("end", () => res(Buffer.concat(chunks))));
  const W = 841.89;
  const M = 30;
  const cols = [
    { t: "Fecha", w: 52 },
    { t: "Comprobante", w: 92 },
    { t: "Cliente", w: 120 },
    { t: "Concepto / detalle", w: 290 },
    { t: "Total", w: 80, r: true },
    { t: "CAE", w: 82 },
    { t: "Estado", w: 66 },
  ];
  const encabezado = () => {
    doc.rect(0, 0, W, 54).fill("#1a1a1a");
    doc.font("Helvetica-Bold").fontSize(15).fillColor("#ffffff").text("MATULOTES", M, 14, { characterSpacing: 2, lineBreak: false });
    doc.font("Helvetica").fontSize(7).fillColor("#EF9F27").text(config.nombreFantasia.toUpperCase(), M, 33, { characterSpacing: 1.5, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor("#ffffff").text("Detalle de facturas ARCA", W / 2, 16, { width: W / 2 - M, align: "right" });
    doc.font("Helvetica").fontSize(8).fillColor("#B4B2A9").text(
      `${desde || hasta ? `Período ${fecha(desde) || "inicio"} al ${fecha(hasta) || "hoy"} · ` : ""}Emitido ${fecha(hoy)} · ${facturas.length} comprobantes`,
      W / 2,
      33,
      { width: W / 2 - M, align: "right" }
    );
    doc.rect(0, 54, W, 2).fill("#EF9F27");
    let x = M;
    doc.rect(M, 66, W - M * 2, 18).fill("#f1efe8");
    doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#633806");
    for (const c of cols) {
      doc.text(c.t.toUpperCase(), x + 4, 72, { width: c.w - 8, align: c.r ? "right" : "left" });
      x += c.w;
    }
    return 90;
  };
  let y = encabezado();
  for (const f of facturas) {
    const det = f.items.map((i) => `${i.descripcion}${i.detalle ? ` — ${i.detalle}` : ""}`).join(" / ");
    doc.font("Helvetica").fontSize(7.5);
    const alto = Math.max(22, doc.heightOfString(det, { width: cols[3].w - 8 }) + 10);
    if (y + alto > 560) {
      doc.addPage();
      y = encabezado();
    }
    const celdas = [
      fecha(f.fecha),
      `${f.tipoCbte === 13 ? "NC C" : "Factura C"}\n${numero(f)}`,
      `${f.receptorNombre}\n${f.receptorDocTipo === 99 ? "" : f.receptorDocNro}`,
      det,
      dinero(f.importeTotal * signo(f), f.moneda),
      f.cae ?? "—",
      `${ESTADO[f.estado] ?? f.estado}${f.entorno === "homologacion" ? "\n(prueba)" : ""}`,
    ];
    let x = M;
    doc.fillColor("#1e293b");
    celdas.forEach((v, i) => {
      doc.text(v, x + 4, y + 5, { width: cols[i].w - 8, align: cols[i].r ? "right" : "left" });
      x += cols[i].w;
    });
    y += alto;
    doc.moveTo(M, y).lineTo(W - M, y).lineWidth(0.4).stroke("#D3D1C7");
  }
  if (y + 60 > 560) {
    doc.addPage();
    y = encabezado();
  }
  y += 12;
  const caja = (t: string, v: string, x: number) => {
    doc.rect(x, y, 200, 38).fill("#1a1a1a");
    doc.font("Helvetica").fontSize(7.5).fillColor("#EF9F27").text(t.toUpperCase(), x + 10, y + 7, { width: 180, characterSpacing: 1 });
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#ffffff").text(v, x + 10, y + 19, { width: 180 });
  };
  caja("Autorizado en pesos", dinero(tot.ars, "PES"), W - M - 620);
  caja("Autorizado en dólares", dinero(tot.usd, "DOL"), W - M - 410);
  caja("Total convertido a pesos", dinero(tot.pesos, "PES"), W - M - 200);
  doc.end();
  const pdf = await fin;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="facturas-arca-${hoy}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
