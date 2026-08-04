import { siteTextos } from "@/lib/data";

export function buildWhatsappUrl(mensaje?: string, numero?: string) {
  const numeroFinal = (numero ?? siteTextos.whatsappNumero).replace(/\D/g, "");
  const texto = encodeURIComponent(mensaje ?? siteTextos.whatsappMensajeDefault);
  return `https://wa.me/${numeroFinal}?text=${texto}`;
}

export function mensajeConsultaLote(nombreLote: string) {
  return `Hola Matías. Me interesa consultar por el ${nombreLote} de Ayres de Guernica.`;
}
