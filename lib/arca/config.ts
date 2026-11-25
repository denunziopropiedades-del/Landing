import type { SupabaseClient } from "@supabase/supabase-js";

export type EntornoArca = "homologacion" | "produccion";

export const URLS = {
  homologacion: {
    wsaa: "https://wsaahomo.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://wswhomo.afip.gov.ar/wsfev1/service.asmx",
  },
  produccion: {
    wsaa: "https://wsaa.afip.gov.ar/ws/services/LoginCms",
    wsfe: "https://servicios1.afip.gov.ar/wsfev1/service.asmx",
  },
} as const;

export type ConfigArca = {
  cuit: string;
  razonSocial: string;
  nombreFantasia: string;
  domicilio: string;
  iibb: string;
  inicioActividades: string | null;
  condicionIva: string;
  matricula: string;
  puntoVenta: number;
  entorno: EntornoArca;
  emisionAutomatica: boolean;
  topeIdentificacion: number;
  telefonos: string;
  web: string;
};

export const CONFIG_POR_DEFECTO: ConfigArca = {
  cuit: "20329177921",
  razonSocial: "DE NUNZIO MATIAS JAVIER",
  nombreFantasia: "DE NUNZIO NEGOCIOS INMOBILIARIOS",
  domicilio: "",
  iibb: "",
  inicioActividades: null,
  condicionIva: "Responsable Monotributo",
  matricula: "Martillero y Corredor Público · Mat. 7886",
  puntoVenta: 8,
  entorno: "homologacion",
  emisionAutomatica: false,
  topeIdentificacion: 10000000,
  telefonos: "11-2742-4512 · 11-6136-5523",
  web: "matulotes.app",
};

export function mapConfig(r: Record<string, unknown> | null): ConfigArca {
  if (!r) return CONFIG_POR_DEFECTO;
  const s = (k: string, d: string) => (typeof r[k] === "string" && (r[k] as string).trim() ? (r[k] as string) : d);
  return {
    cuit: s("cuit", CONFIG_POR_DEFECTO.cuit).replace(/\D/g, ""),
    razonSocial: s("razon_social", CONFIG_POR_DEFECTO.razonSocial),
    nombreFantasia: s("nombre_fantasia", CONFIG_POR_DEFECTO.nombreFantasia),
    domicilio: s("domicilio", ""),
    iibb: s("iibb", ""),
    inicioActividades: (r.inicio_actividades as string | null) ?? null,
    condicionIva: s("condicion_iva", CONFIG_POR_DEFECTO.condicionIva),
    matricula: s("matricula", CONFIG_POR_DEFECTO.matricula),
    puntoVenta: Number(r.punto_venta) || CONFIG_POR_DEFECTO.puntoVenta,
    entorno: r.entorno === "produccion" ? "produccion" : "homologacion",
    emisionAutomatica: r.emision_automatica === true,
    topeIdentificacion: Number(r.tope_identificacion) || CONFIG_POR_DEFECTO.topeIdentificacion,
    telefonos: s("telefonos", CONFIG_POR_DEFECTO.telefonos),
    web: s("web", CONFIG_POR_DEFECTO.web),
  };
}

export async function leerConfig(a: SupabaseClient): Promise<ConfigArca> {
  const { data } = await a.from("arca_config").select("*").eq("id", 1).maybeSingle();
  return mapConfig(data as Record<string, unknown> | null);
}

/** Acepta el PEM tal cual, con "\n" escapados o en base64 (como suelen quedar en variables de entorno). */
function normalizarPem(valor: string | undefined): string | null {
  if (!valor?.trim()) return null;
  let v = valor.trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
  if (!v.includes("-----BEGIN")) {
    try {
      v = Buffer.from(v, "base64").toString("utf8");
    } catch {
      return null;
    }
  }
  return v.includes("-----BEGIN") ? v : null;
}

export function credenciales(entorno: EntornoArca) {
  const cert = normalizarPem(entorno === "produccion" ? process.env.ARCA_CERT : process.env.ARCA_CERT_HOMO);
  const key = normalizarPem(process.env.ARCA_KEY);
  return { cert, key };
}
