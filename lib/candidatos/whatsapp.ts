import { CARGO_LABEL } from "@/lib/candidatos/constants";
import type { Candidato } from "@/types/candidatos";

/** Reemplaza {{nombre}}, {{cargo}} y {{localidad}} en la plantilla configurable. */
export function armarMensajeWhatsapp(plantilla: string, candidato: Pick<Candidato, "nombreApellido" | "cargo" | "localidad">) {
  const primerNombre = candidato.nombreApellido.trim().split(/\s+/)[0] ?? candidato.nombreApellido;
  return plantilla
    .replaceAll("{{nombre}}", primerNombre)
    .replaceAll("{{cargo}}", CARGO_LABEL[candidato.cargo])
    .replaceAll("{{localidad}}", candidato.localidad ?? "");
}

/** Arma el link de wa.me agregando el código de país argentino (54 9) si hace falta. */
export function buildWhatsappCandidatoUrl(telefono: string, mensaje: string) {
  const digitos = telefono.replace(/\D/g, "");
  let numero = digitos;
  if (digitos.startsWith("549")) numero = digitos;
  else if (digitos.startsWith("54")) numero = `549${digitos.slice(2)}`;
  else numero = `549${digitos}`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
