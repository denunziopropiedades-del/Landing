import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { GRAPH } from "@/lib/mensajeria";

export const runtime = "nodejs";

/**
 * Muestra una foto, audio o documento que mandó un cliente por WhatsApp.
 * Meta no da un link público: hay que pedir la url con el token y descargarla.
 * Solo para usuarios del panel.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil) return new NextResponse("No autorizado", { status: 401 });

  const { id } = await params;
  const token = process.env.WHATSAPP_TOKEN;
  if (!token || !/^\d+$/.test(id)) return new NextResponse("No disponible", { status: 404 });

  const info = await fetch(`${GRAPH}/${id}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!info.ok) return new NextResponse("No disponible", { status: 404 });
  const { url, mime_type } = (await info.json()) as { url?: string; mime_type?: string };
  if (!url) return new NextResponse("No disponible", { status: 404 });

  const archivo = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!archivo.ok || !archivo.body) return new NextResponse("No disponible", { status: 404 });

  return new NextResponse(archivo.body, {
    headers: {
      "Content-Type": mime_type || archivo.headers.get("content-type") || "application/octet-stream",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
