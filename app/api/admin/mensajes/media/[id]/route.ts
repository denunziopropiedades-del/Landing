import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { GRAPH } from "@/lib/mensajeria";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

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
  if (!/^\d+$/.test(id)) return new NextResponse("No disponible", { status: 404 });

  // Token del número por el que llegó el archivo (conexión del panel) o WHATSAPP_TOKEN.
  let token = process.env.WHATSAPP_TOKEN ?? null;
  const admin = await getSupabaseAdminClient();
  if (admin) {
    const { data } = await admin
      .from("mensajes")
      .select("conversacion:conversaciones(canal:mensajes_canales(access_token))")
      .eq("media_id", id)
      .limit(1)
      .maybeSingle();
    const conv = data?.conversacion as unknown as { canal?: { access_token?: string | null } | { access_token?: string | null }[] } | null;
    const canal = Array.isArray(conv?.canal) ? conv?.canal[0] : conv?.canal;
    if (canal?.access_token) token = canal.access_token;
  }
  if (!token) return new NextResponse("No disponible", { status: 404 });

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
