import { siteTextosSeed } from "@/lib/data";

export function buildWhatsappUrl(mensaje?: string, numero?: string) {
  const numeroFinal = (numero ?? siteTextosSeed.whatsappNumero).replace(/\D/g, "");
  const texto = encodeURIComponent(mensaje ?? siteTextosSeed.whatsappMensajeDefault);
  return `https://wa.me/${numeroFinal}?text=${texto}`;
}

export function mensajeConsultaLote(nombreLote: string) {
  return `Hola, me interesa consultar por el ${nombreLote}.`;
}
