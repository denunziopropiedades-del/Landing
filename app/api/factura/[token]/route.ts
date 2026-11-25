import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { leerConfig } from "@/lib/arca/config";
import { mapFactura } from "@/lib/arca/facturas";
import { generarFacturaPdf } from "@/lib/arca/pdf";
import { nombreArchivo } from "@/lib/arca/envio";

export const runtime = "nodejs";

/** PDF público de una factura autorizada (link largo e impredecible, para mandar por WhatsApp). */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{40,80}$/.test(token)) return new NextResponse("No encontrada", { status: 404 });
  const admin = await getSupabaseAdminClient();
  if (!admin) return new NextResponse("No disponible", { status: 503 });
  const { data } = await admin.from("arca_facturas").select("*").eq("token_publico", token).eq("estado", "autorizada").maybeSingle();
  if (!data) return new NextResponse("No encontrada", { status: 404 });
  const f = mapFactura(data);
  const pdf = await generarFacturaPdf(f, await leerConfig(admin));
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${nombreArchivo(f)}"`, "Cache-Control": "private, no-store" },
  });
}
