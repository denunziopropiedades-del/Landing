/** Pesos argentinos sin decimales (uso: pretensión/remuneración diaria), ej. "$ 50.000". */
export function formatPesosDiarios(value: number | null | undefined) {
  if (value === null || value === undefined) return "Sin especificar";
  return `$ ${new Intl.NumberFormat("es-AR").format(Math.round(value))}`;
}
