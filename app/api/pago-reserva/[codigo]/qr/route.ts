import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Imagen QR del link de pago de Mercado Pago de una reserva (para mails y la página del cliente). */
export async function GET(_request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const admin = await getSupabaseAdminClient();
  if (!admin || limpio.length !== 10) return new NextResponse("No encontrado", { status: 404 });
  const { data } = await admin.from("doc_emitidos").select("pago_link, pago_estado, estado").eq("codigo_verificacion", limpio).maybeSingle();
  if (!data?.pago_link || data.pago_estado === "abonado" || data.estado === "anulado") return new NextResponse("No disponible", { status: 404 });
  const png = await QRCode.toBuffer(String(data.pago_link), { type: "png", errorCorrectionLevel: "M", margin: 2, width: 360 });
  return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" } });
}
