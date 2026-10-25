import { siteTextosSeed } from "@/lib/data";

/** Números que reciben las consultas de WhatsApp que llegan desde la web.
 * Cada clic se reparte al azar entre ellos (ver app/api/whatsapp/route.ts). */
export const NUMEROS_WHATSAPP_CONSULTAS = ["5491127424512", "5491161365523"];

export function numeroWhatsappAleatorio() {
  return NUMEROS_WHATSAPP_CONSULTAS[Math.floor(Math.random() * NUMEROS_WHATSAPP_CONSULTAS.length)];
}

/** Link de WhatsApp para las consultas de la web. No apunta a un número fijo:
 * pasa por /api/whatsapp, que en cada clic elige uno de los números al azar.
 * El parámetro `numero` se mantiene por compatibilidad pero ya no se usa. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function buildWhatsappUrl(mensaje?: string, numero?: string) {
  const texto = encodeURIComponent(mensaje ?? siteTextosSeed.whatsappMensajeDefault);
  return `/api/whatsapp?text=${texto}`;
}

export function mensajeConsultaLote(nombreLote: string) {
  return `Hola, me interesa consultar por el ${nombreLote}.`;
}

/** Arma el link de wa.me para escribirle a un cliente, agregando el código de país
 * argentino (54 9) si el teléfono no lo tiene ya cargado. Con `mensaje`, lo deja
 * precargado en el chat (ej. para reenviar el link de pago de la seña). */
export function buildWhatsappClienteUrl(telefono: string, mensaje?: string) {
  const digitos = telefono.replace(/\D/g, "");
  let numero = digitos;
  if (digitos.startsWith("549")) numero = digitos;
  else if (digitos.startsWith("54")) numero = `549${digitos.slice(2)}`;
  else numero = `549${digitos}`;
  return mensaje ? `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}` : `https://wa.me/${numero}`;
}
