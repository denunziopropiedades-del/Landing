import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { mapTasacion } from "@/lib/tasador";
import { generarPdfTasacion } from "@/lib/tasador-pdf";

export const runtime = "nodejs";

/** Vista previa del informe de tasación en PDF, para el panel (antes de aprobarlo). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return new NextResponse("No autorizado", { status: 401 });
  const { id } = await params;
  const admin = await getSupabaseAdminClient();
  if (!admin) return new NextResponse("No disponible", { status: 503 });
  const { data } = await admin.from("tasaciones").select("*").eq("id", id).maybeSingle();
  if (!data) return new NextResponse("No encontrado", { status: 404 });
  const pdf = await generarPdfTasacion(mapTasacion(data));
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="informe-tasacion.pdf"`, "Cache-Control": "private, no-store" },
  });
}
