/** Cruce entre lo que busca cada cliente y los lotes disponibles (se usa en el servidor y en el navegador). */

export type LoteDisponible = {
  id: string;
  proyecto: string;
  zona: string;
  manzana: string;
  numero: string;
  superficieM2: number | null;
  precioUsd: number | null;
  anticipoUsd: number | null;
  cuotas: number | null;
  valorCuotaUsd: number | null;
};

export type LeadConBusqueda = {
  id: string;
  nombre: string;
  telefono: string;
  estado: string;
  origen: string | null;
  presupuestoUsd: number | null;
  zona: string | null;
  pago: string | null;
  anticipo: string | null;
  notas: string | null;
};

const sinAcentos = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** ¿Este lote le sirve a este cliente según lo que busca? */
export function loteCoincide(lote: LoteDisponible, lead: LeadConBusqueda): boolean {
  if (lead.zona) {
    const z = sinAcentos(lead.zona);
    const donde = sinAcentos(`${lote.zona} ${lote.proyecto}`);
    const palabras = z.split(/[\s,/]+/).filter((p) => p.length >= 3);
    if (palabras.length && !palabras.some((p) => donde.includes(p))) return false;
  }
  if (lead.pago === "cuotas" && !(lote.cuotas && lote.cuotas > 0)) return false;
  if (lead.presupuestoUsd) {
    // Si paga en cuotas, el presupuesto se compara con el anticipo; si no, con el precio total.
    const comparar = lead.pago === "cuotas" && lote.anticipoUsd ? lote.anticipoUsd : lote.precioUsd;
    if (comparar && comparar > lead.presupuestoUsd) return false;
  }
  return true;
}
