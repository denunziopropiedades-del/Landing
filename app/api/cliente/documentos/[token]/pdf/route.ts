import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { leerPdf, registrarAcceso, resolverToken } from "@/lib/docs-clientes/core";

export const runtime = "nodejs";

/** PDF del documento para el cliente (con su link privado). ?descargar=1 lo baja como archivo. */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rate = await checkRateLimit(request, "doc-cliente-pdf", 40, 600);
  if (!rate.success) return new NextResponse("Demasiadas solicitudes. Probá en unos minutos.", { status: 429 });
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  if (!admin) return new NextResponse("No disponible", { status: 503 });
  const acceso = await resolverToken(admin, token);
  if (!acceso.ok) return new NextResponse("El enlace no es válido o venció.", { status: 404 });
  const pdf = await leerPdf(admin, acceso.doc);
  if (!pdf) return new NextResponse("Documento no disponible.", { status: 404 });
  const descargar = new URL(request.url).searchParams.get("descargar") === "1";
  await registrarAcceso(admin, acceso.doc.id, acceso.linkId, descargar ? "descarga" : "pdf");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${acceso.doc.numero}.pdf"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
