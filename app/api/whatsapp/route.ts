import { NextResponse, type NextRequest } from "next/server";
import { numeroWhatsappAleatorio } from "@/lib/whatsapp";

// Cada clic tiene que elegir un número nuevo: nada de caché.
export const dynamic = "force-dynamic";

// Parámetros de seguimiento que no aportan nada al asesor y alargan el link.
const PARAMS_RUIDO = ["fbclid", "gclid", "gbraid", "wbraid", "msclkid", "igshid", "_gl"];

/** Página de la web desde la que se tocó el botón (header Referer), limpia de
 * parámetros de seguimiento. Solo se aceptan páginas del mismo sitio. */
function paginaDeOrigen(request: NextRequest): string | null {
  const referer = request.headers.get("referer");
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.host !== request.nextUrl.host) return null;
    // Links privados del cliente (llevan un token): no se reenvían por WhatsApp.
    if (url.pathname.startsWith("/visita/reprogramar") || url.pathname.startsWith("/admin")) return null;
    for (const p of PARAMS_RUIDO) url.searchParams.delete(p);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

/** Redirige a WhatsApp con uno de los números de consultas elegido al azar,
 * manteniendo el mensaje precargado (?text=...) y agregando al final el link
 * de la página desde la que llegó la consulta. */
export function GET(request: NextRequest) {
  const texto = request.nextUrl.searchParams.get("text")?.trim() ?? "";
  const pagina = paginaDeOrigen(request);
  const mensaje = [texto, pagina ? `Vi esto en: ${pagina}` : ""].filter(Boolean).join("\n\n");

  const numero = numeroWhatsappAleatorio();
  const destino = mensaje ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : `https://wa.me/${numero}`;

  const response = NextResponse.redirect(destino, 302);
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}
