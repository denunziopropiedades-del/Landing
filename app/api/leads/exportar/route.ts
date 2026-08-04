import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLeads, getVisitas } from "@/lib/admin/data";

export async function GET() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [leads, visitas] = await Promise.all([getLeads(), getVisitas()]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Ayres de Guernica";
  workbook.created = new Date();

  const hojaLeads = workbook.addWorksheet("Leads");
  hojaLeads.columns = [
    { header: "Fecha", key: "fecha", width: 20 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Nombre", key: "nombre", width: 20 },
    { header: "Apellido", key: "apellido", width: 20 },
    { header: "DNI", key: "dni", width: 14 },
    { header: "Email", key: "email", width: 28 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Manzana", key: "manzana", width: 10 },
    { header: "Lote", key: "lote", width: 16 },
    { header: "Mensaje", key: "mensaje", width: 40 },
    { header: "Estado", key: "estado", width: 14 },
  ];
  hojaLeads.getRow(1).font = { bold: true };
  leads.forEach((l) =>
    hojaLeads.addRow({
      fecha: new Date(l.creadoEn).toLocaleString("es-AR"),
      tipo: l.tipo,
      nombre: l.nombre,
      apellido: l.apellido ?? "",
      dni: l.dni ?? "",
      email: l.email,
      telefono: l.telefono,
      manzana: l.manzana ?? "",
      lote: l.lote ?? "",
      mensaje: l.mensaje ?? "",
      estado: l.estado,
    })
  );

  const hojaVisitas = workbook.addWorksheet("Visitas");
  hojaVisitas.columns = [
    { header: "Fecha de creación", key: "creadoEn", width: 20 },
    { header: "Nombre", key: "nombre", width: 20 },
    { header: "Email", key: "email", width: 28 },
    { header: "Teléfono", key: "telefono", width: 18 },
    { header: "Fecha de visita", key: "fecha", width: 16 },
    { header: "Horario", key: "horario", width: 12 },
    { header: "Estado", key: "estado", width: 14 },
  ];
  hojaVisitas.getRow(1).font = { bold: true };
  visitas.forEach((v) =>
    hojaVisitas.addRow({
      creadoEn: new Date(v.creadoEn).toLocaleString("es-AR"),
      nombre: v.nombre,
      email: v.email,
      telefono: v.telefono,
      fecha: v.fecha,
      horario: v.horario,
      estado: v.estado,
    })
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="ayres-de-guernica-leads-${Date.now()}.xlsx"`,
    },
  });
}
