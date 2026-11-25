import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { leerConfig } from "@/lib/arca/config";
import { leerFactura } from "@/lib/arca/facturas";
import { generarFacturaPdf } from "@/lib/arca/pdf";
import { nombreArchivo } from "@/lib/arca/envio";

export const runtime = "nodejs";

/** PDF de una factura (o vista previa de un borrador) para el panel. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const admin = await getSupabaseAdminClient();
  if (!admin) return new NextResponse("No disponible", { status: 503 });
  const f = await leerFactura(admin, id);
  if (!f) return new NextResponse("No encontrada", { status: 404 });
  const pdf = await generarFacturaPdf(f, await leerConfig(admin));
  const descarga = new URL(request.url).searchParams.get("descargar") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descarga ? "attachment" : "inline"}; filename="${nombreArchivo(f)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
