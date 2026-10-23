/** Tipos, constantes y helpers de propiedades: sin dependencias de servidor (se usan también en el navegador). */
import { nombrePartido } from "@/lib/zonas";

export type Operacion = "venta" | "alquiler";
export type TipoPropiedad = "casa" | "departamento" | "ph" | "local" | "terreno" | "campo" | "chacra";
export type UnidadPrecio = "total" | "mes" | "ha" | "ha_anio";
export type SituacionDominial = "escritura" | "posesion";

export const SITUACIONES: { value: SituacionDominial; label: string; detalle: string }[] = [
  { value: "escritura", label: "Escritura", detalle: "Con escritura traslativa de dominio" },
  { value: "posesion", label: "Derechos de posesión", detalle: "Derechos posesorios (animus domini)" },
];
export const labelSituacion = (s: SituacionDominial | null) => SITUACIONES.find((x) => x.value === s)?.label ?? null;

export type Propiedad = {
  id: string;
  slug: string;
  titulo: string;
  descripcion: string;
  operacion: Operacion;
  tipo: TipoPropiedad;
  partido: string;
  localidad: string | null;
  direccion: string | null;
  mapsUrl: string | null;
  precio: number | null;
  moneda: "USD" | "ARS";
  precioUnidad: UnidadPrecio;
  expensas: number | null;
  ambientes: number | null;
  dormitorios: number | null;
  banos: number | null;
  supCubierta: number | null;
  supTotal: number | null;
  aptoCredito: boolean;
  financiacionDirecta: boolean;
  /** Situación dominial: escritura o derechos de posesión. */
  situacion: SituacionDominial | null;
  hectareas: number | null;
  aptitud: string | null;
  agua: string | null;
  luz: boolean | null;
  etiquetas: string[];
  fotos: string[];
  publicado: boolean;
  destacado: boolean;
  orden: number;
  creadoEn: string;
};

export const TIPOS: { value: TipoPropiedad; label: string; plural: string }[] = [
  { value: "casa", label: "Casa", plural: "Casas" },
  { value: "departamento", label: "Departamento", plural: "Departamentos" },
  { value: "ph", label: "PH", plural: "PH" },
  { value: "local", label: "Local", plural: "Locales" },
  { value: "terreno", label: "Terreno", plural: "Terrenos" },
  { value: "campo", label: "Campo", plural: "Campos" },
  { value: "chacra", label: "Chacra", plural: "Chacras" },
];

export const TIPOS_RURALES: TipoPropiedad[] = ["campo", "chacra"];
export const esRural = (t: TipoPropiedad) => TIPOS_RURALES.includes(t);

export function labelTipo(t: TipoPropiedad) {
  return TIPOS.find((x) => x.value === t)?.label ?? t;
}

export function mapPropiedad(p: Record<string, unknown>): Propiedad {
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  return {
    id: p.id as string,
    slug: p.slug as string,
    titulo: p.titulo as string,
    descripcion: (p.descripcion as string) ?? "",
    operacion: p.operacion as Operacion,
    tipo: p.tipo as TipoPropiedad,
    partido: p.partido as string,
    localidad: (p.localidad as string) ?? null,
    direccion: (p.direccion as string) ?? null,
    mapsUrl: (p.maps_url as string) ?? null,
    precio: num(p.precio),
    moneda: ((p.moneda as string) ?? "USD") as "USD" | "ARS",
    precioUnidad: ((p.precio_unidad as string) ?? "total") as UnidadPrecio,
    expensas: num(p.expensas),
    ambientes: num(p.ambientes),
    dormitorios: num(p.dormitorios),
    banos: num(p.banos),
    supCubierta: num(p.sup_cubierta),
    supTotal: num(p.sup_total),
    aptoCredito: Boolean(p.apto_credito),
    financiacionDirecta: Boolean(p.financiacion_directa),
    situacion: p.situacion_dominial === "escritura" || p.situacion_dominial === "posesion" ? p.situacion_dominial : null,
    hectareas: num(p.hectareas),
    aptitud: (p.aptitud as string) ?? null,
    agua: (p.agua as string) ?? null,
    luz: p.luz === null || p.luz === undefined ? null : Boolean(p.luz),
    etiquetas: (p.etiquetas as string[]) ?? [],
    fotos: (p.fotos as string[]) ?? [],
    publicado: Boolean(p.publicado),
    destacado: Boolean(p.destacado),
    orden: (p.orden as number) ?? 0,
    creadoEn: (p.creado_en as string) ?? "",
  };
}

export function formatearPrecio(p: Pick<Propiedad, "precio" | "moneda" | "precioUnidad">) {
  if (p.precio === null || p.precio === undefined) return "Consultar";
  const monto = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(p.precio);
  const base = p.moneda === "USD" ? `USD ${monto}` : `$ ${monto}`;
  const sufijo = { total: "", mes: " /mes", ha: " /ha", ha_anio: " /ha/año" }[p.precioUnidad];
  return base + sufijo;
}

export function ubicacionTexto(p: Pick<Propiedad, "localidad" | "partido">) {
  const partido = nombrePartido(p.partido);
  return p.localidad && p.localidad !== partido ? `${p.localidad}, ${partido}` : partido;
}

export function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}
