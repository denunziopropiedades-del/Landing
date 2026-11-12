/** Números y fechas en letras (castellano rioplatense), para pagarés y documentos. */

const UNIDADES = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
const ESPECIALES: Record<number, string> = {
  10: "diez", 11: "once", 12: "doce", 13: "trece", 14: "catorce", 15: "quince",
  16: "dieciséis", 17: "diecisiete", 18: "dieciocho", 19: "diecinueve",
  20: "veinte", 21: "veintiuno", 22: "veintidós", 23: "veintitrés", 24: "veinticuatro",
  25: "veinticinco", 26: "veintiséis", 27: "veintisiete", 28: "veintiocho", 29: "veintinueve",
};
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
const CENTENAS = ["", "ciento", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

function dosCifras(n: number): string {
  if (n < 10) return UNIDADES[n];
  if (n < 30) return ESPECIALES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d];
}

function tresCifras(n: number): string {
  if (n === 100) return "cien";
  const c = Math.floor(n / 100);
  const resto = n % 100;
  return [CENTENAS[c], dosCifras(resto)].filter(Boolean).join(" ");
}

/** "uno" → "un", "veintiuno" → "veintiún" (delante de "mil" / "millones"). */
function apocope(t: string) {
  return t.replace(/veintiuno$/, "veintiún").replace(/uno$/, "un");
}

/** Entero en letras: 1250 → "un mil doscientos cincuenta". */
export function enteroEnLetras(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "cero";
  const millones = Math.floor(n / 1_000_000);
  const miles = Math.floor((n % 1_000_000) / 1000);
  const resto = n % 1000;
  const partes: string[] = [];
  if (millones) partes.push(millones === 1 ? "un millón" : `${apocope(enteroEnLetras(millones))} millones`);
  if (miles) partes.push(miles === 1 ? "un mil" : `${apocope(tresCifras(miles))} mil`);
  if (resto) partes.push(tresCifras(resto));
  return partes.join(" ");
}

/** Importe en letras como se escribe en un pagaré: "DÓLARES ESTADOUNIDENSES UN MIL ... CON 00/100". */
export function importeEnLetras(monto: number, moneda: "USD" | "ARS"): string {
  const centavos = Math.round(Math.abs(monto) * 100);
  const entero = Math.floor(centavos / 100);
  const cent = String(centavos % 100).padStart(2, "0");
  const nombre = moneda === "USD" ? "dólares estadounidenses" : "pesos";
  return `${nombre} ${enteroEnLetras(entero)} con ${cent}/100`.toUpperCase();
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2027-03-10" → "diez de marzo de dos mil veintisiete". */
export function fechaEnLetras(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dia = d === 1 ? "primero" : enteroEnLetras(d);
  return `${dia} de ${MESES[m - 1]} de ${enteroEnLetras(a)}`;
}

/** "2026-11-12" → "12 de noviembre de 2026". */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} de ${MESES[m - 1]} de ${a}`;
}

/** "2027-03-10" → "10/03/2027". */
export function fechaCorta(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
