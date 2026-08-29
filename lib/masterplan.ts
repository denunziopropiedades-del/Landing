export type BloqueManzana = { manzana: string; x1: number; y1: number; x2: number; y2: number };

/**
 * Calcula pos_x/pos_y para un lote dentro de un bloque rectangular de manzana con el
 * patrón de Arroyos de San Vicente: 2 columnas de 7 filas (10-11 arriba, bajando hasta
 * 4-17) y una fila final de 3 lotes (3, 2, 1) que ocupa todo el ancho del bloque.
 * Devuelve null si el número de lote no encaja en ese patrón (ej. "PLAZA", "Zona Comun").
 */
export function posicionEnBloque(bloque: BloqueManzana, numeroStr: string): { posX: number; posY: number } | null {
  const numero = Number(numeroStr);
  if (!Number.isInteger(numero) || numero < 1 || numero > 17) return null;

  const { x1, y1, x2, y2 } = bloque;
  const xIzq = x1 + (x2 - x1) * 0.25;
  const xDer = x1 + (x2 - x1) * 0.75;

  if (numero >= 1 && numero <= 3) {
    // Fila inferior: 3, 2, 1 de izquierda a derecha.
    const yInf = y1 + (y2 - y1) * (7.5 / 8);
    const xPos = x1 + ((x2 - x1) * ((4 - numero) * 2 - 1)) / 6; // 3->1/6, 2->3/6, 1->5/6
    return { posX: Math.round(xPos * 10) / 10, posY: Math.round(yInf * 10) / 10 };
  }

  // 4..17: columna izquierda baja de 10 a 4 (filas 0..6), columna derecha sube de 11 a 17.
  const esIzquierda = numero >= 4 && numero <= 10;
  const fila = esIzquierda ? 10 - numero : numero - 11;
  const y = y1 + (y2 - y1) * ((fila + 0.5) / 8);
  const x = esIzquierda ? xIzq : xDer;
  return { posX: Math.round(x * 10) / 10, posY: Math.round(y * 10) / 10 };
}
