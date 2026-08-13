import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLeads, getVisitas } from "@/lib/admin/data";
import type { EstadoLead } from "@/types/site";

export const runtime = "nodejs";

const ESTADOS: { estado: EstadoLead; label: string; color: string }[] = [
  { estado: "nuevo", label: "Nuevo", color: "#3b82f6" },
  { estado: "contactado", label: "Contactado", color: "#a855f7" },
  { estado: "visita_programada", label: "Visita Programada", color: "#f59e0b" },
  { estado: "visita_realizada", label: "Visita realizada", color: "#0ea5e9" },
  { estado: "reservado", label: "Reservado", color: "#eab308" },
  { estado: "pago_confirmado", label: "Pago confirmado", color: "#06b6d4" },
  { estado: "pendiente_firma_escribania", label: "Pend. firma escribanía", color: "#fb923c" },
  { estado: "firmado_escribania", label: "Firmado escribanía", color: "#14b8a6" },
  { estado: "vendido", label: "Vendido", color: "#16a34a" },
  { estado: "descartado", label: "Descartado", color: "#ef4444" },
];

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const proyectoId = searchParams.get("proyecto");
  const estadoFiltro = searchParams.get("estado");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let [leads, visitas] = await Promise.all([getLeads(), getVisitas()]);

  if (proyectoId) leads = leads.filter((l) => l.proyectoId === proyectoId);
  if (estadoFiltro) leads = leads.filter((l) => l.estado === estadoFiltro);
  if (desde) leads = leads.filter((l) => l.creadoEn >= desde);
  if (hasta) leads = leads.filter((l) => l.creadoEn <= `${hasta}T23:59:59`);

  if (proyectoId) visitas = visitas.filter((v) => v.proyectoId === proyectoId);
  if (desde) visitas = visitas.filter((v) => v.creadoEn >= desde);
  if (hasta) visitas = visitas.filter((v) => v.creadoEn <= `${hasta}T23:59:59`);

  const doc = new PDFDocument({ size: "A4", margin: 40 });

  // ── Encabezado ──────────────────────────────────────────────────────────
  doc.fontSize(20).fillColor("#0b0f0d").text("Matu Lotes", { continued: false });
  doc.fontSize(14).fillColor("#237046").text("Reporte de leads y visitas");
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .fillColor("#666666")
    .text(`Generado el ${new Date().toLocaleString("es-AR")}`)
    .text(
      `Filtros: ${proyectoId ? "proyecto seleccionado" : "todos los proyectos"} · ${
        estadoFiltro ? `estado "${estadoFiltro}"` : "todos los estados"
      }${desde ? ` · desde ${desde}` : ""}${hasta ? ` · hasta ${hasta}` : ""}`
    );
  doc.moveDown(1);

  // ── Resumen por estado (barras) ───────────────────────────────────────────
  doc.fontSize(12).fillColor("#0b0f0d").text("Leads por estado", { underline: false });
  doc.moveDown(0.5);

  const total = Math.max(leads.length, 1);
  const barX = 40;
  const barMaxWidth = 350;
  let y = doc.y;

  for (const { estado, label, color } of ESTADOS) {
    const cantidad = leads.filter((l) => l.estado === estado).length;
    const width = Math.max((cantidad / total) * barMaxWidth, cantidad > 0 ? 4 : 0);

    doc.fontSize(9).fillColor("#333333").text(label, barX, y, { width: 140 });
    doc.rect(barX + 145, y - 1, barMaxWidth, 10).fill("#eeeeee");
    if (width > 0) doc.rect(barX + 145, y - 1, width, 10).fill(color);
    doc.fillColor("#333333").text(String(cantidad), barX + 145 + barMaxWidth + 10, y, { width: 30 });

    y += 18;
  }

  doc.y = y + 10;
  doc.moveDown(1);

  // ── Tabla de leads ────────────────────────────────────────────────────────
  const columnas = [
    { key: "fecha", label: "Fecha", width: 65 },
    { key: "nombre", label: "Nombre", width: 100 },
    { key: "proyecto", label: "Proyecto", width: 110 },
    { key: "telefono", label: "Teléfono", width: 90 },
    { key: "estado", label: "Estado", width: 95 },
  ];

  function dibujarEncabezadoTabla(titulo: string) {
    doc.addPage();
    doc.fontSize(13).fillColor("#0b0f0d").text(titulo);
    doc.moveDown(0.5);
    let x = 40;
    doc.fontSize(9).fillColor("#ffffff");
    doc.rect(40, doc.y, columnas.reduce((a, c) => a + c.width, 0), 18).fill("#154a2e");
    const rowY = doc.y + 4;
    for (const col of columnas) {
      doc.fillColor("#ffffff").text(col.label, x + 4, rowY, { width: col.width - 8 });
      x += col.width;
    }
    doc.y = rowY + 16;
  }

  dibujarEncabezadoTabla("Detalle de leads");

  for (const [i, lead] of leads.entries()) {
    if (doc.y > 760) dibujarEncabezadoTabla("Detalle de leads (continuación)");

    const filaY = doc.y;
    if (i % 2 === 0) {
      doc.rect(40, filaY - 2, columnas.reduce((a, c) => a + c.width, 0), 16).fill("#f7f5f0");
    }

    let x = 40;
    const valores: Record<string, string> = {
      fecha: new Date(lead.creadoEn).toLocaleDateString("es-AR"),
      nombre: `${lead.nombre} ${lead.apellido ?? ""}`.trim(),
      proyecto: lead.proyectoNombre ?? "—",
      telefono: lead.telefono,
      estado: lead.estado,
    };
    doc.fontSize(8).fillColor("#222222");
    for (const col of columnas) {
      doc.text(valores[col.key] ?? "", x + 4, filaY, { width: col.width - 8, ellipsis: true });
      x += col.width;
    }
    doc.y = filaY + 16;
  }

  if (leads.length === 0) {
    doc.fontSize(9).fillColor("#888888").text("No hay leads que coincidan con los filtros seleccionados.");
  }

  // ── Tabla de visitas ─────────────────────────────────────────────────────
  const columnasVisitas = [
    { key: "fecha", label: "Fecha visita", width: 80 },
    { key: "horario", label: "Horario", width: 60 },
    { key: "nombre", label: "Nombre", width: 130 },
    { key: "telefono", label: "Teléfono", width: 100 },
    { key: "estado", label: "Estado", width: 90 },
  ];

  function dibujarEncabezadoVisitas(titulo: string) {
    doc.addPage();
    doc.fontSize(13).fillColor("#0b0f0d").text(titulo);
    doc.moveDown(0.5);
    let x = 40;
    doc.rect(40, doc.y, columnasVisitas.reduce((a, c) => a + c.width, 0), 18).fill("#154a2e");
    const rowY = doc.y + 4;
    for (const col of columnasVisitas) {
      doc.fontSize(9).fillColor("#ffffff").text(col.label, x + 4, rowY, { width: col.width - 8 });
      x += col.width;
    }
    doc.y = rowY + 16;
  }

  dibujarEncabezadoVisitas("Visitas agendadas");

  for (const [i, visita] of visitas.entries()) {
    if (doc.y > 760) dibujarEncabezadoVisitas("Visitas agendadas (continuación)");

    const filaY = doc.y;
    if (i % 2 === 0) {
      doc.rect(40, filaY - 2, columnasVisitas.reduce((a, c) => a + c.width, 0), 16).fill("#f7f5f0");
    }

    let x = 40;
    const valores: Record<string, string> = {
      fecha: visita.fecha,
      horario: visita.horario,
      nombre: visita.nombre,
      telefono: visita.telefono,
      estado: visita.estado,
    };
    doc.fontSize(8).fillColor("#222222");
    for (const col of columnasVisitas) {
      doc.text(valores[col.key] ?? "", x + 4, filaY, { width: col.width - 8, ellipsis: true });
      x += col.width;
    }
    doc.y = filaY + 16;
  }

  if (visitas.length === 0) {
    doc.fontSize(9).fillColor("#888888").text("No hay visitas que coincidan con los filtros seleccionados.");
  }

  const buffer = await pdfToBuffer(doc);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-leads-${Date.now()}.pdf"`,
    },
  });
}
