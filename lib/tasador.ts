import { z } from "zod";
import { PARTIDOS, nombrePartido } from "@/lib/zonas";

/**
 * Tasador online: estimación orientativa de valor de venta con datos básicos.
 * Método comparativo simplificado: valor unitario de referencia por partido
 * (editable desde el panel) × coeficientes de ajuste por características.
 * Sirve en servidor y navegador (sin dependencias de Node).
 */

/* ───────── Opciones del formulario ───────── */

export type GrupoTasador = "lote" | "casa" | "depto" | "campo";

export const TIPOS_TASADOR = [
  { value: "lote", label: "Lote / terreno", grupo: "lote", ayuda: "Lotes en barrio abierto o cerrado" },
  { value: "casa", label: "Casa", grupo: "casa", ayuda: "Casa en lote propio" },
  { value: "quinta", label: "Quinta", grupo: "casa", ayuda: "Casaquinta con parque" },
  { value: "departamento", label: "Departamento", grupo: "depto", ayuda: "En edificio" },
  { value: "ph", label: "PH", grupo: "depto", ayuda: "Propiedad horizontal" },
  { value: "campo", label: "Campo / fracción", grupo: "campo", ayuda: "Por hectárea" },
] as const;

export type TipoTasador = (typeof TIPOS_TASADOR)[number]["value"];

export const grupoDe = (tipo: string): GrupoTasador =>
  (TIPOS_TASADOR.find((t) => t.value === tipo)?.grupo ?? "lote") as GrupoTasador;

export const ENTORNOS = [
  { value: "cerrado", label: "Barrio cerrado / club de campo", factor: 1.6 },
  { value: "consolidado", label: "Barrio abierto consolidado", factor: 1.15 },
  { value: "desarrollo", label: "Zona en desarrollo", factor: 0.85 },
  { value: "rural", label: "Zona rural / periurbana", factor: 0.5 },
] as const;

export const ESCRITURAS = [
  { value: "escritura", label: "Con escritura", factor: 1 },
  { value: "boleto", label: "Boleto de compraventa", factor: 0.85 },
  { value: "posesion", label: "Posesión / cesión de derechos", factor: 0.6 },
] as const;

export const ESTADOS_CONSERVACION = [
  { value: "excelente", label: "Excelente / a estrenar", factor: 1.1 },
  { value: "muy-bueno", label: "Muy bueno", factor: 1 },
  { value: "bueno", label: "Bueno", factor: 0.9 },
  { value: "regular", label: "Regular", factor: 0.75 },
  { value: "refaccionar", label: "A refaccionar", factor: 0.55 },
] as const;

export const ANTIGUEDADES = [
  { value: "estrenar", label: "A estrenar", factor: 1.08 },
  { value: "hasta-10", label: "Hasta 10 años", factor: 1 },
  { value: "10-30", label: "De 10 a 30 años", factor: 0.9 },
  { value: "30-50", label: "De 30 a 50 años", factor: 0.8 },
  { value: "mas-50", label: "Más de 50 años", factor: 0.7 },
] as const;

export const APTITUDES = [
  { value: "agricola", label: "Agrícola", factor: 1.3 },
  { value: "mixto", label: "Mixto", factor: 1 },
  { value: "ganadero", label: "Ganadero", factor: 0.75 },
] as const;

export const ACCESOS = [
  { value: "asfalto", label: "Sobre ruta o asfalto", factor: 1.15 },
  { value: "consolidado", label: "Camino consolidado", factor: 1 },
  { value: "tierra", label: "Camino de tierra", factor: 0.88 },
] as const;

/** Extras por grupo: cada uno suma un porcentaje o un importe fijo en USD. */
export const EXTRAS: Record<GrupoTasador, { value: string; label: string; pct?: number; usd?: number }[]> = {
  lote: [
    { value: "luz", label: "Luz", pct: 4 },
    { value: "agua", label: "Agua corriente", pct: 4 },
    { value: "gas", label: "Gas natural", pct: 4 },
    { value: "cloacas", label: "Cloacas", pct: 4 },
    { value: "pavimento", label: "Calle asfaltada", pct: 6 },
    { value: "esquina", label: "Esquina", pct: 5 },
  ],
  casa: [
    { value: "cochera", label: "Cochera", usd: 4000 },
    { value: "pileta", label: "Pileta", usd: 8000 },
    { value: "quincho", label: "Quincho / parrilla", usd: 5000 },
    { value: "gas", label: "Gas natural", pct: 3 },
    { value: "pavimento", label: "Calle asfaltada", pct: 4 },
  ],
  depto: [
    { value: "cochera", label: "Cochera", pct: 8 },
    { value: "amenities", label: "Amenities (pileta, SUM)", pct: 5 },
    { value: "frente", label: "Al frente / luminoso", pct: 4 },
  ],
  campo: [
    { value: "casco", label: "Casa o casco", usd: 40000 },
    { value: "galpon", label: "Galpón", usd: 15000 },
    { value: "alambrados", label: "Alambrados y aguadas", pct: 3 },
    { value: "luz", label: "Electricidad", pct: 3 },
  ],
};

export const ESTADOS_TASACION = [
  { value: "nuevo", label: "Nueva" },
  { value: "contactado", label: "Contactado" },
  { value: "informe_enviado", label: "Informe enviado" },
  { value: "autorizada", label: "Autorización firmada" },
  { value: "descartada", label: "Descartada" },
] as const;
export type EstadoTasacion = (typeof ESTADOS_TASACION)[number]["value"];

export const labelOpcion = (lista: readonly { value: string; label: string }[], v: string | null | undefined) =>
  lista.find((x) => x.value === v)?.label ?? v ?? "";

const factorDe = (lista: readonly { value: string; factor: number }[], v: string | null | undefined, porDefecto = 1) =>
  lista.find((x) => x.value === v)?.factor ?? porDefecto;

/* ───────── Valores de referencia por partido ───────── */

export type ValoresZona = {
  /** USD por m² de terreno (lote tipo en barrio abierto, con escritura). */
  lote_m2: number;
  /** USD por m² cubierto de casa usada en buen estado (sin el terreno). */
  casa_m2: number;
  /** USD por m² cubierto de departamento usado. */
  depto_m2: number;
  /** USD por hectárea de campo mixto. */
  campo_ha: number;
};

/**
 * Valores iniciales (noviembre 2026), armados con promedios de avisos publicados.
 * "relevado" = hay un promedio publicado para ese partido; el resto son estimados
 * por cercanía y deben ajustarse desde el panel (Tasador → Valores por zona).
 */
export const VALORES_INICIALES: Record<string, ValoresZona & { relevado: (keyof ValoresZona)[] }> = {
  "la-plata": { lote_m2: 120, casa_m2: 900, depto_m2: 1400, campo_ha: 9000, relevado: ["depto_m2", "casa_m2"] },
  berisso: { lote_m2: 60, casa_m2: 650, depto_m2: 950, campo_ha: 6000, relevado: [] },
  ensenada: { lote_m2: 65, casa_m2: 700, depto_m2: 1000, campo_ha: 6000, relevado: [] },
  "presidente-peron": { lote_m2: 55, casa_m2: 650, depto_m2: 900, campo_ha: 12000, relevado: ["lote_m2"] },
  "san-vicente": { lote_m2: 39, casa_m2: 650, depto_m2: 900, campo_ha: 10000, relevado: ["lote_m2"] },
  brandsen: { lote_m2: 35, casa_m2: 650, depto_m2: 900, campo_ha: 8000, relevado: [] },
  "general-paz": { lote_m2: 25, casa_m2: 600, depto_m2: 850, campo_ha: 6500, relevado: [] },
  canuelas: { lote_m2: 52, casa_m2: 750, depto_m2: 1000, campo_ha: 12000, relevado: ["lote_m2"] },
  monte: { lote_m2: 30, casa_m2: 650, depto_m2: 900, campo_ha: 7500, relevado: [] },
  lobos: { lote_m2: 30, casa_m2: 650, depto_m2: 900, campo_ha: 10000, relevado: ["campo_ha"] },
  "roque-perez": { lote_m2: 22, casa_m2: 600, depto_m2: 850, campo_ha: 7000, relevado: [] },
  saladillo: { lote_m2: 22, casa_m2: 600, depto_m2: 850, campo_ha: 6500, relevado: ["campo_ha"] },
  magdalena: { lote_m2: 25, casa_m2: 600, depto_m2: 850, campo_ha: 5000, relevado: [] },
  "punta-indio": { lote_m2: 20, casa_m2: 550, depto_m2: 800, campo_ha: 4000, relevado: [] },
};

const VALOR_GENERICO: ValoresZona = { lote_m2: 30, casa_m2: 650, depto_m2: 900, campo_ha: 7000 };

export const CAMPOS_VALOR: { campo: keyof ValoresZona; label: string; unidad: string }[] = [
  { campo: "lote_m2", label: "Lote", unidad: "USD/m²" },
  { campo: "casa_m2", label: "Casa (construido)", unidad: "USD/m²" },
  { campo: "depto_m2", label: "Depto / PH", unidad: "USD/m²" },
  { campo: "campo_ha", label: "Campo", unidad: "USD/ha" },
];

export function valoresIniciales(partido: string): ValoresZona {
  const v = VALORES_INICIALES[partido];
  return v ? { lote_m2: v.lote_m2, casa_m2: v.casa_m2, depto_m2: v.depto_m2, campo_ha: v.campo_ha } : { ...VALOR_GENERICO };
}

/** Mezcla los valores guardados en la base (si hay) sobre los iniciales. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function valoresDesdeFilas(filas: any[] | null | undefined): Record<string, ValoresZona> {
  const mapa: Record<string, ValoresZona> = {};
  for (const p of PARTIDOS) mapa[p.slug] = valoresIniciales(p.slug);
  for (const f of filas ?? []) {
    if (!f?.partido || !mapa[f.partido]) continue;
    for (const { campo } of CAMPOS_VALOR) {
      const n = Number(f[campo]);
      if (Number.isFinite(n) && n > 0) mapa[f.partido][campo] = n;
    }
  }
  return mapa;
}

/* ───────── Datos del pedido ───────── */

const valores = <T extends readonly { value: string }[]>(lista: T) =>
  lista.map((x) => x.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

const numero = (max: number) => z.number().min(0).max(max).optional();

export const tasadorSchema = z.object({
  nombre: z.string().trim().min(2, "Ingresá tu nombre").max(120),
  telefono: z.string().trim().min(6, "Ingresá tu WhatsApp").max(40),
  email: z.string().trim().max(200).optional(),
  tipo: z.enum(valores(TIPOS_TASADOR)),
  partido: z.string().refine((v) => PARTIDOS.some((p) => p.slug === v), "Elegí la zona"),
  localidad: z.string().trim().max(120).optional(),
  direccion: z.string().trim().max(200).optional(),
  /** m² de terreno (en campos: hectáreas). */
  supTerreno: numero(100_000_000),
  supCubierta: numero(100_000),
  supDescubierta: numero(100_000),
  entorno: z.enum(valores(ENTORNOS)).optional(),
  escritura: z.enum(valores(ESCRITURAS)).optional(),
  estado: z.enum(valores(ESTADOS_CONSERVACION)).optional(),
  antiguedad: z.enum(valores(ANTIGUEDADES)).optional(),
  aptitud: z.enum(valores(APTITUDES)).optional(),
  acceso: z.enum(valores(ACCESOS)).optional(),
  extras: z.array(z.string().max(30)).max(20).optional(),
});

export type DatosTasador = z.infer<typeof tasadorSchema>;
export type CaracteristicasTasador = Omit<DatosTasador, "nombre" | "telefono" | "email">;

/** Valida que estén las superficies mínimas según el tipo. Devuelve el mensaje de error o null. */
export function faltanteTasador(d: CaracteristicasTasador): string | null {
  const g = grupoDe(d.tipo);
  if (g === "lote" && !(Number(d.supTerreno) > 0)) return "Indicá la superficie del lote en m².";
  if (g === "campo" && !(Number(d.supTerreno) > 0)) return "Indicá la superficie en hectáreas.";
  if (g === "casa" && !(Number(d.supCubierta) > 0)) return "Indicá los m² cubiertos de la casa.";
  if (g === "casa" && !(Number(d.supTerreno) > 0)) return "Indicá los m² del terreno.";
  if (g === "depto" && !(Number(d.supCubierta) > 0)) return "Indicá los m² cubiertos.";
  return null;
}

/* ───────── Cálculo ───────── */

export type RenglonDesglose = { concepto: string; detalle: string; factor?: number; importe?: number };

export type ResultadoTasador = {
  minimo: number;
  central: number;
  maximo: number;
  /** Precio sugerido de publicación (deja margen de negociación). */
  publicacion: number;
  superficie: number;
  unidad: "m²" | "ha";
  /** Valor central ÷ superficie. */
  unitario: number;
  margenPct: number;
  desglose: RenglonDesglose[];
};

export function redondear(n: number): number {
  const paso = n >= 200_000 ? 5000 : n >= 50_000 ? 1000 : n >= 10_000 ? 500 : 100;
  return Math.max(0, Math.round(n / paso) * paso);
}

/** Los lotes grandes valen menos por m² que el lote tipo; los chicos, algo más. */
function factorSuperficieLote(m2: number) {
  if (m2 <= 400) return 1.1;
  if (m2 <= 800) return 1;
  if (m2 <= 1500) return 0.85;
  if (m2 <= 5000) return 0.6;
  return 0.4;
}

/** Las fracciones chicas se pagan mucho más por hectárea que los campos grandes. */
function factorSuperficieCampo(ha: number) {
  if (ha <= 5) return 2.5;
  if (ha <= 20) return 1.6;
  if (ha <= 50) return 1.2;
  if (ha <= 200) return 1;
  return 0.92;
}

const pct = (f: number) => `${f >= 1 ? "+" : "−"}${Math.abs(Math.round((f - 1) * 100))}%`;

export function calcularTasacion(d: CaracteristicasTasador, zona: ValoresZona): ResultadoTasador {
  const g = grupoDe(d.tipo);
  const extras = new Set(d.extras ?? []);
  const desglose: RenglonDesglose[] = [];
  const partido = nombrePartido(d.partido);
  let total = 0;
  let superficie = 0;
  let unidad: "m²" | "ha" = "m²";
  let margenPct = 12;

  const ajuste = (concepto: string, detalle: string, factor: number) => {
    if (factor !== 1) desglose.push({ concepto, detalle: `${detalle} (${pct(factor)})`, factor });
    return factor;
  };
  const extrasPct = (grupo: GrupoTasador) => {
    let f = 1;
    for (const e of EXTRAS[grupo]) if (e.pct && extras.has(e.value)) f *= ajuste("Extra", e.label, 1 + e.pct / 100);
    return f;
  };
  const extrasUsd = (grupo: GrupoTasador, coef = 1) => {
    let s = 0;
    for (const e of EXTRAS[grupo]) {
      if (e.usd && extras.has(e.value)) {
        const importe = e.usd * coef;
        s += importe;
        desglose.push({ concepto: "Mejora", detalle: e.label, importe: Math.round(importe) });
      }
    }
    return s;
  };

  /** Valor del terreno con sus ajustes (sirve para lotes y para el terreno de casas y quintas). */
  const terreno = (m2: number, conServicios: boolean) => {
    desglose.push({ concepto: "Valor de referencia", detalle: `Lote en ${partido}: USD ${zona.lote_m2}/m²`, importe: Math.round(m2 * zona.lote_m2) });
    let f = 1;
    f *= ajuste("Ubicación", labelOpcion(ENTORNOS, d.entorno ?? "consolidado"), factorDe(ENTORNOS, d.entorno ?? "consolidado"));
    f *= ajuste("Superficie", `${Math.round(m2).toLocaleString("es-AR")} m²`, factorSuperficieLote(m2));
    if (conServicios) {
      const basicos = ["luz", "agua", "gas", "cloacas"].filter((s) => extras.has(s)).length;
      if (basicos === 0) f *= ajuste("Servicios", "Sin servicios declarados", 0.9);
      f *= extrasPct("lote");
    }
    return m2 * zona.lote_m2 * f;
  };

  if (g === "lote") {
    superficie = Number(d.supTerreno ?? 0);
    total = terreno(superficie, true);
    total *= ajuste("Documentación", labelOpcion(ESCRITURAS, d.escritura ?? "escritura"), factorDe(ESCRITURAS, d.escritura ?? "escritura"));
  } else if (g === "casa") {
    const m2Terreno = Number(d.supTerreno ?? 0);
    superficie = Number(d.supCubierta ?? 0);
    margenPct = 15;
    const vTerreno = terreno(m2Terreno, false);
    desglose.push({ concepto: "Construcción", detalle: `${superficie} m² cubiertos × USD ${zona.casa_m2}/m²`, importe: Math.round(superficie * zona.casa_m2) });
    let f = 1;
    f *= ajuste("Estado", labelOpcion(ESTADOS_CONSERVACION, d.estado ?? "muy-bueno"), factorDe(ESTADOS_CONSERVACION, d.estado ?? "muy-bueno"));
    f *= ajuste("Antigüedad", labelOpcion(ANTIGUEDADES, d.antiguedad ?? "hasta-10"), factorDe(ANTIGUEDADES, d.antiguedad ?? "hasta-10"));
    if (d.entorno === "cerrado") f *= ajuste("Categoría", "Construcción en barrio cerrado", 1.25);
    f *= extrasPct("casa");
    let vConstruccion = superficie * zona.casa_m2 * f;
    const semi = Number(d.supDescubierta ?? 0);
    if (semi > 0) {
      const v = semi * zona.casa_m2 * 0.35 * factorDe(ESTADOS_CONSERVACION, d.estado ?? "muy-bueno");
      desglose.push({ concepto: "Semicubierto", detalle: `${semi} m² de galería o quincho al 35%`, importe: Math.round(v) });
      vConstruccion += v;
    }
    total = vTerreno + vConstruccion + extrasUsd("casa", factorDe(ESTADOS_CONSERVACION, d.estado ?? "muy-bueno"));
    total *= ajuste("Documentación", labelOpcion(ESCRITURAS, d.escritura ?? "escritura"), factorDe(ESCRITURAS, d.escritura ?? "escritura"));
  } else if (g === "depto") {
    superficie = Number(d.supCubierta ?? 0);
    const descubierta = Number(d.supDescubierta ?? 0);
    const homogenea = superficie + descubierta * 0.3;
    desglose.push({
      concepto: "Valor de referencia",
      detalle: `Departamento en ${partido}: USD ${zona.depto_m2}/m²${descubierta > 0 ? ` (balcón o patio de ${descubierta} m² al 30%)` : ""}`,
      importe: Math.round(homogenea * zona.depto_m2),
    });
    let f = 1;
    if (d.tipo === "ph") f *= ajuste("Tipo", "PH", 0.92);
    f *= ajuste("Estado", labelOpcion(ESTADOS_CONSERVACION, d.estado ?? "muy-bueno"), factorDe(ESTADOS_CONSERVACION, d.estado ?? "muy-bueno"));
    f *= ajuste("Antigüedad", labelOpcion(ANTIGUEDADES, d.antiguedad ?? "hasta-10"), factorDe(ANTIGUEDADES, d.antiguedad ?? "hasta-10"));
    f *= extrasPct("depto");
    total = homogenea * zona.depto_m2 * f;
    total *= ajuste("Documentación", labelOpcion(ESCRITURAS, d.escritura ?? "escritura"), factorDe(ESCRITURAS, d.escritura ?? "escritura"));
  } else {
    superficie = Number(d.supTerreno ?? 0);
    unidad = "ha";
    margenPct = 18;
    desglose.push({ concepto: "Valor de referencia", detalle: `Campo mixto en ${partido}: USD ${zona.campo_ha.toLocaleString("es-AR")}/ha`, importe: Math.round(superficie * zona.campo_ha) });
    let f = 1;
    f *= ajuste("Aptitud", labelOpcion(APTITUDES, d.aptitud ?? "mixto"), factorDe(APTITUDES, d.aptitud ?? "mixto"));
    f *= ajuste("Acceso", labelOpcion(ACCESOS, d.acceso ?? "consolidado"), factorDe(ACCESOS, d.acceso ?? "consolidado"));
    f *= ajuste("Superficie", `${superficie.toLocaleString("es-AR")} ha`, factorSuperficieCampo(superficie));
    f *= extrasPct("campo");
    total = superficie * zona.campo_ha * f + extrasUsd("campo");
    total *= ajuste("Documentación", labelOpcion(ESCRITURAS, d.escritura ?? "escritura"), factorDe(ESCRITURAS, d.escritura ?? "escritura"));
  }

  const central = redondear(total);
  return {
    minimo: redondear(total * (1 - margenPct / 100)),
    central,
    maximo: redondear(total * (1 + margenPct / 100)),
    publicacion: redondear(total * 1.07),
    superficie,
    unidad,
    unitario: superficie > 0 ? Math.round(central / superficie) : 0,
    margenPct,
    desglose,
  };
}

/* ───────── Informe comparativo (lo completa y aprueba la inmobiliaria) ───────── */

export type Comparable = { descripcion: string; fuente: string; precio: number; superficie: number };

export type InformeTasacion = {
  minimo: number;
  central: number;
  maximo: number;
  publicacion: number;
  comparables: Comparable[];
  observaciones: string;
};

export const unitarioComparable = (c: Comparable) => (c.superficie > 0 ? c.precio / c.superficie : 0);

export function promedioComparables(lista: Comparable[]): number {
  const validos = lista.map(unitarioComparable).filter((u) => u > 0);
  return validos.length ? validos.reduce((s, u) => s + u, 0) / validos.length : 0;
}

/* ───────── Fila de la base ───────── */

export type Tasacion = {
  id: string;
  creadoEn: string;
  nombre: string;
  telefono: string;
  email: string | null;
  tipo: TipoTasador;
  partido: string;
  localidad: string | null;
  direccion: string | null;
  datos: CaracteristicasTasador;
  resultado: ResultadoTasador;
  estado: EstadoTasacion;
  notas: string | null;
  informe: InformeTasacion | null;
  informeToken: string | null;
  informeAprobadoEn: string | null;
  docId: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mapTasacion = (r: any): Tasacion => ({
  id: r.id,
  creadoEn: r.creado_en,
  nombre: r.nombre,
  telefono: r.telefono,
  email: r.email ?? null,
  tipo: r.tipo,
  partido: r.partido,
  localidad: r.localidad ?? null,
  direccion: r.direccion ?? null,
  datos: r.datos ?? {},
  resultado: r.resultado ?? {},
  estado: r.estado,
  notas: r.notas ?? null,
  informe: r.informe ?? null,
  informeToken: r.informe_token ?? null,
  informeAprobadoEn: r.informe_aprobado_en ?? null,
  docId: r.doc_id ?? null,
});

export const usd = (n: number | null | undefined) => `USD ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(n ?? 0))}`;

/** "Casa en Guernica, Presidente Perón (Calle 12 n.º 345)". */
export function descripcionInmueble(t: Pick<Tasacion, "tipo" | "partido" | "localidad" | "direccion">): string {
  const lugar = [t.localidad, nombrePartido(t.partido)].filter(Boolean).join(", ");
  return `${labelOpcion(TIPOS_TASADOR, t.tipo)} en ${lugar}${t.direccion ? ` (${t.direccion})` : ""}`;
}

/** Renglones "etiqueta: valor" con las características cargadas (para el panel, el informe y el PDF). */
export function caracteristicas(t: Pick<Tasacion, "tipo" | "datos">): { etiqueta: string; valor: string }[] {
  const d = t.datos;
  const g = grupoDe(t.tipo);
  const f: { etiqueta: string; valor: string }[] = [];
  const n = (v: number | undefined) => Number(v ?? 0).toLocaleString("es-AR");
  if (g === "campo") f.push({ etiqueta: "Superficie", valor: `${n(d.supTerreno)} ha` });
  else if (d.supTerreno) f.push({ etiqueta: g === "lote" ? "Superficie" : "Terreno", valor: `${n(d.supTerreno)} m²` });
  if (d.supCubierta) f.push({ etiqueta: "Superficie cubierta", valor: `${n(d.supCubierta)} m²` });
  if (d.supDescubierta) f.push({ etiqueta: g === "depto" ? "Balcón / patio" : "Semicubierta", valor: `${n(d.supDescubierta)} m²` });
  if (d.entorno && g !== "depto" && g !== "campo") f.push({ etiqueta: "Ubicación", valor: labelOpcion(ENTORNOS, d.entorno) });
  if (d.estado && (g === "casa" || g === "depto")) f.push({ etiqueta: "Estado", valor: labelOpcion(ESTADOS_CONSERVACION, d.estado) });
  if (d.antiguedad && (g === "casa" || g === "depto")) f.push({ etiqueta: "Antigüedad", valor: labelOpcion(ANTIGUEDADES, d.antiguedad) });
  if (d.aptitud && g === "campo") f.push({ etiqueta: "Aptitud", valor: labelOpcion(APTITUDES, d.aptitud) });
  if (d.acceso && g === "campo") f.push({ etiqueta: "Acceso", valor: labelOpcion(ACCESOS, d.acceso) });
  if (d.escritura) f.push({ etiqueta: "Documentación", valor: labelOpcion(ESCRITURAS, d.escritura) });
  const ex = (d.extras ?? []).map((e) => EXTRAS[g].find((x) => x.value === e)?.label).filter(Boolean);
  if (ex.length) f.push({ etiqueta: g === "lote" ? "Servicios y extras" : "Extras", valor: ex.join(", ") });
  return f;
}

/** Informe final: el que aprobó la inmobiliaria si existe; si no, el resultado automático. */
export function informeEfectivo(t: Pick<Tasacion, "informe" | "resultado">): InformeTasacion {
  return (
    t.informe ?? {
      minimo: t.resultado.minimo,
      central: t.resultado.central,
      maximo: t.resultado.maximo,
      publicacion: t.resultado.publicacion,
      comparables: [],
      observaciones: "",
    }
  );
}
