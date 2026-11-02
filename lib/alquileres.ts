/** Administración de alquileres: tipos y cálculos compartidos (servidor y navegador). */

export type Moneda = "ARS" | "USD";
export type MedioPagoAlq = "efectivo" | "transferencia" | "mercadopago";

export type PersonaAlq = {
  id: string;
  tipo: "propietario" | "inquilino";
  nombre: string;
  dni: string | null;
  cuit: string | null;
  email: string | null;
  telefono: string | null;
  domicilio: string | null;
  cbuAlias: string | null;
  notas: string | null;
  token: string;
};

export type ContratoAlq = {
  id: string;
  propiedadId: string | null;
  direccion: string;
  localidad: string | null;
  propietarioId: string;
  inquilinoId: string;
  garantes: string | null;
  fechaInicio: string;
  fechaFin: string;
  moneda: Moneda;
  montoActual: number;
  diaVencimiento: number;
  comisionAdminPct: number;
  punitorioDiarioPct: number;
  deposito: number | null;
  proximoAjuste: string | null;
  ajusteDetalle: string | null;
  estado: "activo" | "finalizado" | "rescindido";
  notas: string | null;
};

export type CuotaAlq = {
  id: string;
  contratoId: string;
  periodo: string;
  vencimiento: string;
  monto: number;
  extras: number;
  extrasDetalle: string | null;
  punitorios: number;
  pagadoMonto: number | null;
  pagadoEn: string | null;
  medioPago: MedioPagoAlq | null;
  mpLink: string | null;
  reciboNumero: number | null;
  liquidacionId: string | null;
  notas: string | null;
};

export type ServicioAlq = {
  id: string;
  contratoId: string;
  concepto: string;
  aCargo: "inquilino" | "propietario";
  periodo: string | null;
  vencimiento: string | null;
  monto: number | null;
  pagado: boolean;
  pagadoEn: string | null;
  notas: string | null;
};

export type LiquidacionAlq = {
  id: string;
  contratoId: string;
  propietarioId: string;
  periodo: string;
  cobrado: number;
  comision: number;
  gastos: number;
  gastosDetalle: string | null;
  neto: number;
  pagadaEn: string | null;
  medioPago: string | null;
  notas: string | null;
  creadoEn: string;
};

export const CONCEPTOS_SERVICIO = ["Expensas", "ABL / Municipal", "ARBA (inmobiliario)", "Luz", "Gas", "Agua (AySA)", "Internet", "Seguro", "Otro"];

const num = (v: unknown) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const numN = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
const str = (v: unknown) => (v === null || v === undefined || v === "" ? null : String(v));

/* eslint-disable @typescript-eslint/no-explicit-any */
export const mapPersona = (r: any): PersonaAlq => ({
  id: r.id,
  tipo: r.tipo,
  nombre: r.nombre,
  dni: str(r.dni),
  cuit: str(r.cuit),
  email: str(r.email),
  telefono: str(r.telefono),
  domicilio: str(r.domicilio),
  cbuAlias: str(r.cbu_alias),
  notas: str(r.notas),
  token: r.token,
});

export const mapContrato = (r: any): ContratoAlq => ({
  id: r.id,
  propiedadId: str(r.propiedad_id),
  direccion: r.direccion,
  localidad: str(r.localidad),
  propietarioId: r.propietario_id,
  inquilinoId: r.inquilino_id,
  garantes: str(r.garantes),
  fechaInicio: r.fecha_inicio,
  fechaFin: r.fecha_fin,
  moneda: r.moneda === "USD" ? "USD" : "ARS",
  montoActual: num(r.monto_actual),
  diaVencimiento: Number(r.dia_vencimiento ?? 10),
  comisionAdminPct: num(r.comision_admin_pct),
  punitorioDiarioPct: num(r.punitorio_diario_pct),
  deposito: numN(r.deposito),
  proximoAjuste: str(r.proximo_ajuste),
  ajusteDetalle: str(r.ajuste_detalle),
  estado: r.estado,
  notas: str(r.notas),
});

export const mapCuota = (r: any): CuotaAlq => ({
  id: r.id,
  contratoId: r.contrato_id,
  periodo: r.periodo,
  vencimiento: r.vencimiento,
  monto: num(r.monto),
  extras: num(r.extras),
  extrasDetalle: str(r.extras_detalle),
  punitorios: num(r.punitorios),
  pagadoMonto: numN(r.pagado_monto),
  pagadoEn: str(r.pagado_en),
  medioPago: (str(r.medio_pago) as MedioPagoAlq | null) ?? null,
  mpLink: str(r.mp_link),
  reciboNumero: numN(r.recibo_numero),
  liquidacionId: str(r.liquidacion_id),
  notas: str(r.notas),
});

export const mapServicio = (r: any): ServicioAlq => ({
  id: r.id,
  contratoId: r.contrato_id,
  concepto: r.concepto,
  aCargo: r.a_cargo === "propietario" ? "propietario" : "inquilino",
  periodo: str(r.periodo),
  vencimiento: str(r.vencimiento),
  monto: numN(r.monto),
  pagado: Boolean(r.pagado),
  pagadoEn: str(r.pagado_en),
  notas: str(r.notas),
});

export const mapLiquidacion = (r: any): LiquidacionAlq => ({
  id: r.id,
  contratoId: r.contrato_id,
  propietarioId: r.propietario_id,
  periodo: r.periodo,
  cobrado: num(r.cobrado),
  comision: num(r.comision),
  gastos: num(r.gastos),
  gastosDetalle: str(r.gastos_detalle),
  neto: num(r.neto),
  pagadaEn: str(r.pagada_en),
  medioPago: str(r.medio_pago),
  notas: str(r.notas),
  creadoEn: r.creado_en,
});
/* eslint-enable @typescript-eslint/no-explicit-any */

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "2026-11-01" → "noviembre 2026" */
export function nombrePeriodo(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[(m ?? 1) - 1]} ${a}`;
}

/** "2026-11-05" → "05/11/2026" */
export function fechaCorta(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatoMonto(v: number, moneda: Moneda): string {
  const n = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);
  return moneda === "USD" ? `USD ${n}` : `$ ${n}`;
}

/** Fecha de hoy (Argentina) como "YYYY-MM-DD". */
export function hoyIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function diasEntre(desde: string, hasta: string): number {
  const a = Date.parse(`${desde.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${hasta.slice(0, 10)}T00:00:00Z`);
  return Math.round((b - a) / 86400000);
}

/** Primer día de cada mes entre el inicio del contrato y `hasta` (inclusive), sin pasar el fin del contrato. */
export function periodosContrato(c: Pick<ContratoAlq, "fechaInicio" | "fechaFin">, hasta: string): string[] {
  const out: string[] = [];
  let [a, m] = c.fechaInicio.split("-").map(Number);
  const [af, mf] = (hasta < c.fechaFin ? hasta : c.fechaFin).split("-").map(Number);
  while (a < af || (a === af && m <= mf)) {
    out.push(`${a}-${String(m).padStart(2, "0")}-01`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
    if (out.length > 240) break;
  }
  return out;
}

export function vencimientoDe(periodo: string, dia: number): string {
  return `${periodo.slice(0, 8)}${String(Math.min(Math.max(dia, 1), 28)).padStart(2, "0")}`;
}

/** Punitorios a la fecha: monto × % diario × días de atraso (solo si no está pagada). */
export function punitoriosCalculados(cuota: CuotaAlq, contrato: Pick<ContratoAlq, "punitorioDiarioPct">, alDia = hoyIso()): number {
  if (cuota.pagadoEn || !contrato.punitorioDiarioPct) return cuota.punitorios;
  const dias = diasEntre(cuota.vencimiento, alDia);
  if (dias <= 0) return cuota.punitorios;
  return Math.round(cuota.monto * (contrato.punitorioDiarioPct / 100) * dias * 100) / 100 + cuota.punitorios;
}

export type EstadoCuota = "pagada" | "vencida" | "por_vencer" | "futura";

export function estadoCuota(c: CuotaAlq, alDia = hoyIso()): EstadoCuota {
  if (c.pagadoEn) return "pagada";
  if (c.vencimiento < alDia) return "vencida";
  if (diasEntre(alDia, c.vencimiento) <= 10) return "por_vencer";
  return "futura";
}

export function totalCuota(c: CuotaAlq, contrato: Pick<ContratoAlq, "punitorioDiarioPct">, alDia = hoyIso()): number {
  return Math.round((c.monto + c.extras + punitoriosCalculados(c, contrato, alDia)) * 100) / 100;
}

export function diasParaVencer(fecha: string, alDia = hoyIso()): number {
  return diasEntre(alDia, fecha);
}
