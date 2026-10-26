export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// Formato local: separador de miles con punto, centavos con coma (ej. 1.400,50).
function formatMiles(value: number) {
  const num = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
}

export function formatUsd(value: number) {
  return `${formatMiles(value)} USD`;
}

export function formatArs(value: number) {
  return `$ ${formatMiles(value)}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
}

/** Formatea según la moneda: "USD" → "300 USD", "ARS" → "$ 500.000". */
export function formatMoneda(value: number, moneda?: string | null) {
  return moneda === "ARS" ? formatArs(value) : formatUsd(value);
}
