import { NextResponse, type NextRequest } from "next/server";
import { registrarBajaNewsletter } from "@/lib/newsletter-baja";

export const dynamic = "force-dynamic";

/** Baja "en un clic" que piden Gmail/Outlook (header List-Unsubscribe-Post). */
export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  try {
    const email = await registrarBajaNewsletter(token);
    if (!email) return NextResponse.json({ ok: false, error: "Link inválido" }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

/** Si alguien abre el link en el navegador, lo mandamos a la página de confirmación. */
export function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("t") ?? "";
  return NextResponse.redirect(new URL(`/newsletter/baja?t=${encodeURIComponent(token)}`, request.url));
}
