const ZONA = "America/Argentina/Buenos_Aires";

/** Fecha de hoy en la zona horaria de Argentina, para que los cron jobs (que
 * corren en UTC en Vercel) comparen contra el mismo día que ve el usuario. */
export function hoyEnArgentina(): { anio: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obtener = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: obtener("year"), mes: obtener("month") - 1, dia: obtener("day") };
}

/** Suma N meses a una fecha "YYYY-MM-DD", conservando el mismo día del mes (ej. el
 * 10 de cada mes) para el cuotario. Si el mes destino no tiene ese día (ej. 31 de
 * febrero), cae en el último día disponible de ese mes. */
export function sumarMeses(fecha: string, meses: number): string {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const destino = new Date(Date.UTC(anio, mes - 1 + meses, dia));
  // Si el día "se corrió" de mes (ej. pedir el 31 en un mes de 30 días), Date lo
  // empuja al mes siguiente; en ese caso usamos el último día del mes destino.
  if (destino.getUTCDate() !== dia) {
    destino.setUTCDate(0);
  }
  return destino.toISOString().slice(0, 10);
}
