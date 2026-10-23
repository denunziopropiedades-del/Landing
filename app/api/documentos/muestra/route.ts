import { NextResponse } from "next/server";
import { generarDocumentoPdf } from "@/lib/documentos/pdf";
import { MODELOS_INCORPORADOS } from "@/lib/documentos/plantillas";

export const runtime = "nodejs";

/** Solo en versiones de prueba (preview): PDF de muestra para revisar el diseño. */
export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") return NextResponse.json({ error: "No disponible" }, { status: 404 });
  const pdf = await generarDocumentoPdf({
    titulo: "Aceptación de cargo judicial",
    cuerpo: MODELOS_INCORPORADOS[0].cuerpo,
    valores: {
      "nombre del perito": "Matías De Nunzio",
      "especialidad del perito": "Martillero",
      "matrícula": "0000",
      "domicilio constituido": "Las Piedras 2020, 2.º piso A",
      "actor": "PÉREZ JUAN",
      "demandado": "GÓMEZ MARÍA",
      "número de expediente": "79810/2025",
      "persona citada": "Juan Pérez",
      "día de la pericia": "2026-08-07",
      "hora de la pericia": "09:00",
      "domicilio de la pericia": "Las Piedras 2020, 2.º piso A, Ciudad Autónoma de Buenos Aires",
      "teléfono de contacto": "11-6136-5523",
    },
    firma: { nombre: "Matías De Nunzio", detalle: "Martillero Público · Mat. N.º 0000" },
    comprimir: false,
  });
  return new NextResponse(new Uint8Array(pdf), { headers: { "Content-Type": "text/plain; charset=latin1" } });
}
