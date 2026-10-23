import { NextResponse } from "next/server";
import { z } from "zod";
import { getPerfilActual } from "@/lib/admin/auth";
import { generarDocumentoPdf } from "@/lib/documentos/pdf";
import { nombreArchivo } from "@/lib/documentos/plantillas";

export const runtime = "nodejs";

const schema = z.object({
  titulo: z.string().min(1).max(200),
  cuerpo: z.string().min(1).max(60000),
  valores: z.record(z.string(), z.string().max(4000)),
  firma: z.object({ nombre: z.string().max(120), detalle: z.string().max(200) }),
});

/** Genera el PDF de un contrato o escrito a partir de un modelo y sus datos (solo usuarios del panel). */
export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos incompletos para generar el documento." }, { status: 400 });

  const { titulo, cuerpo, valores, firma } = parsed.data;
  const pdf = await generarDocumentoPdf({ titulo, cuerpo, valores, firma });
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo(titulo, valores)}"`,
      "Cache-Control": "no-store",
    },
  });
}
