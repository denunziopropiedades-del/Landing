import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { mapTasacion } from "@/lib/tasador";
import { generarPdfTasacion } from "@/lib/tasador-pdf";

export const runtime = "nodejs";

/** PDF del informe aprobado, para el propietario (con su link privado). ?descargar=1 lo baja como archivo. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rate = await checkRateLimit(request, "tasador-informe-pdf", 30, 600);
  if (!rate.success) return new NextResponse("Demasiadas solicitudes. Probá en unos minutos.", { status: 429 });
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(token)) return new NextResponse("El enlace no es válido.", { status: 404 });
  const admin = await getSupabaseAdminClient();
  if (!admin) return new NextResponse("No disponible", { status: 503 });
  const { data } = await admin.from("tasaciones").select("*").eq("informe_token", token).maybeSingle();
  if (!data || !data.informe_aprobado_en) return new NextResponse("El enlace no es válido.", { status: 404 });
  const pdf = await generarPdfTasacion(mapTasacion(data));
  const descargar = new URL(request.url).searchParams.get("descargar") === "1";
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="informe-tasacion.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
