import { NextResponse, type NextRequest } from "next/server";
import { numeroWhatsappAleatorio } from "@/lib/whatsapp";

// Cada clic tiene que elegir un número nuevo: nada de caché.
export const dynamic = "force-dynamic";

/** Redirige a WhatsApp con uno de los números de consultas elegido al azar,
 * manteniendo el mensaje precargado (?text=...). */
export function GET(request: NextRequest) {
  const texto = request.nextUrl.searchParams.get("text");
  const numero = numeroWhatsappAleatorio();
  const destino = texto ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : `https://wa.me/${numero}`;

  const response = NextResponse.redirect(destino, 302);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
