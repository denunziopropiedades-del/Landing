import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export const runtime = "nodejs";

export async function GET() {
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Estados");

  hoja.columns = [
    { header: "Manzana", key: "manzana", width: 12 },
    { header: "Numero", key: "numero", width: 12 },
    { header: "Estado", key: "estado", width: 16 },
    { header: "PosX", key: "posX", width: 10 },
    { header: "PosY", key: "posY", width: 10 },
  ];
  hoja.getRow(1).font = { bold: true };

  hoja.addRow({ manzana: "1", numero: "1", estado: "vendido", posX: 5, posY: 15 });
  hoja.addRow({ manzana: "1", numero: "2", estado: "reservado", posX: 6.8, posY: 15 });
  hoja.addRow({ manzana: "1", numero: "3", estado: "disponible", posX: 8.6, posY: 15 });
  hoja.addRow({ manzana: "1", numero: "102", estado: "no_disponible", posX: 5, posY: 30 });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="plantilla-estados-lotes.xlsx"`,
    },
  });
}
