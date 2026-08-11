import { siteTextosSeed } from "@/lib/data";

export function buildWhatsappUrl(mensaje?: string, numero?: string) {
  const numeroFinal = (numero ?? siteTextosSeed.whatsappNumero).replace(/\D/g, "");
  const texto = encodeURIComponent(mensaje ?? siteTextosSeed.whatsappMensajeDefault);
  return `https://wa.me/${numeroFinal}?text=${texto}`;
}

export function mensajeConsultaLote(nombreLote: string) {
  return `Hola, me interesa consultar por el ${nombreLote}.`;
}

/** Arma el link de wa.me para escribirle a un cliente, agregando el código de país
 * argentino (54 9) si el teléfono no lo tiene ya cargado. */
export function buildWhatsappClienteUrl(telefono: string) {
  const digitos = telefono.replace(/\D/g, "");
  let numero = digitos;
  if (digitos.startsWith("549")) numero = digitos;
  else if (digitos.startsWith("54")) numero = `549${digitos.slice(2)}`;
  else numero = `549${digitos}`;
  return `https://wa.me/${numero}`;
}
