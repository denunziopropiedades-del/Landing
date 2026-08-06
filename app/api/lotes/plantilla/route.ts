import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Lotes");

  hoja.columns = [
    { header: "Manzana", key: "manzana", width: 12 },
    { header: "Numero", key: "numero", width: 12 },
    { header: "Precio USD", key: "precio", width: 14 },
    { header: "Medidas", key: "medidas", width: 16 },
  ];
  hoja.getRow(1).font = { bold: true };

  hoja.addRow({ manzana: "A", numero: "1", precio: 2700, medidas: "10 x 30" });
  hoja.addRow({ manzana: "A", numero: "2", precio: 2700, medidas: "10 x 30" });
  hoja.addRow({ manzana: "B", numero: "1", precio: 5400, medidas: "20 x 30" });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla-lotes.xlsx"`,
    },
  });
}
