import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { leerPdf, mapDoc } from "@/lib/docs-clientes/core";

export const runtime = "nodejs";

/** PDF de un documento emitido, para verlo desde el panel. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const admin = await getSupabaseAdminClient();
  if (!admin) return new NextResponse("No disponible", { status: 503 });
  const { data } = await admin.from("doc_emitidos").select("*").eq("id", id).maybeSingle();
  if (!data) return new NextResponse("No encontrado", { status: 404 });
  const doc = mapDoc(data);
  const pdf = await leerPdf(admin, doc);
  if (!pdf) return new NextResponse("PDF no disponible", { status: 404 });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${doc.numero}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
