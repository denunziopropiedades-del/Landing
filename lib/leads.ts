import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Lógica común para registrar consultas en el CRM:
 * - Contactos unificados: si la persona (mismo teléfono) ya tiene una ficha abierta, la consulta
 *   nueva se suma a esa ficha en vez de crear otra.
 * - Origen: de dónde vino el contacto (Meta, Google, Instagram, preventa…) y la campaña (utm).
 */

/** Celular en 10 dígitos (ej. 1127424512), aunque lo escriban con +54 9, 0 o 15. Igual que normalizar_telefono() en SQL. */
export function normalizarTelefono(v: string | null | undefined): string {
  let d = String(v ?? "").replace(/\D/g, "");
  if (d.startsWith("54")) d = d.slice(2);
  if (d.startsWith("9")) d = d.slice(1);
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 12 && d.slice(2, 4) === "15") d = d.slice(0, 2) + d.slice(4);
  return d.length > 10 ? d.slice(-10) : d;
}

export type OrigenLead = {
  origen: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

export const ORIGENES: { value: string; label: string }[] = [
  { value: "meta", label: "Meta (Facebook / Instagram Ads)" },
  { value: "meta_lead_ads", label: "Formulario de Meta (Lead Ads)" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google Ads" },
  { value: "google_organico", label: "Google (búsqueda)" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "preventa", label: "Preventa" },
  { value: "referido_web", label: "Otra web / referido" },
  { value: "referido", label: "Referido (boca en boca)" },
  { value: "cartel", label: "Cartel / oficina" },
  { value: "directo", label: "Entró directo a la web" },
  { value: "otro", label: "Otro" },
];

export function labelOrigen(v: string | null | undefined): string {
  if (!v) return "Sin dato";
  return ORIGENES.find((o) => o.value === v)?.label ?? v;
}

/** Clasifica el canal a partir de los utm, los ids de clic de Meta/Google y el sitio de donde llegó. */
export function clasificarOrigen(p: {
  utmSource?: string | null;
  utmMedium?: string | null;
  fbclid?: boolean;
  gclid?: boolean;
  referrer?: string | null;
}): string {
  const src = (p.utmSource ?? "").toLowerCase();
  if (/instagram|^ig$/.test(src)) return "instagram";
  if (/facebook|^fb$|meta/.test(src)) return "meta";
  if (/google|adwords/.test(src) || p.gclid) return "google";
  if (/whatsapp|^wa$/.test(src)) return "whatsapp";
  if (p.fbclid) return "meta";
  if (src) return src.slice(0, 40);
  let host = "";
  try {
    host = p.referrer ? new URL(p.referrer).hostname.toLowerCase() : "";
  } catch {
    host = "";
  }
  if (!host) return "directo";
  if (host.includes("instagram")) return "instagram";
  if (host.includes("facebook") || host === "fb.me" || host.includes("fb.com")) return "meta";
  if (host.includes("google.")) return "google_organico";
  if (host.includes("whatsapp") || host === "wa.me") return "whatsapp";
  if (host.endsWith("matulotes.app")) return "directo";
  return "referido_web";
}

export const COOKIE_ORIGEN = "ml_origen";

/** Lee el origen que el navegador guardó al entrar a la web (cookie ml_origen). */
export function origenDesdeRequest(request: Request, forzado?: Partial<OrigenLead>): OrigenLead {
  const vacio: OrigenLead = { origen: null, utm_source: null, utm_medium: null, utm_campaign: null };
  let guardado: Partial<OrigenLead> = {};
  const cookie = request.headers.get("cookie") ?? "";
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_ORIGEN}=([^;]+)`));
  if (m) {
    try {
      const o = JSON.parse(decodeURIComponent(m[1])) as Record<string, unknown>;
      const s = (k: string) => (typeof o[k] === "string" && o[k] ? String(o[k]).slice(0, 120) : null);
      guardado = { origen: s("origen"), utm_source: s("utm_source"), utm_medium: s("utm_medium"), utm_campaign: s("utm_campaign") };
    } catch {
      guardado = {};
    }
  }
  const limpio = Object.fromEntries(Object.entries(forzado ?? {}).filter(([, v]) => v)) as Partial<OrigenLead>;
  return { ...vacio, ...guardado, ...limpio };
}

const ORDEN_ESTADOS = [
  "nuevo",
  "contactado",
  "visita_programada",
  "visita_realizada",
  "reservado",
  "pago_confirmado",
  "pendiente_firma_escribania",
  "firmado_escribania",
  "vendido",
];

const COLUMNAS_NUEVAS = [
  "origen",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "busqueda_presupuesto_usd",
  "busqueda_zona",
  "busqueda_pago",
  "busqueda_anticipo",
  "busqueda_notas",
];

function sinColumnasNuevas(fila: Record<string, unknown>) {
  const copia = { ...fila };
  for (const c of COLUMNAS_NUEVAS) delete copia[c];
  return copia;
}

const fechaHoy = () =>
  new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

export type ResultadoLead = { id: string | null; unificado: boolean; error?: string };

/**
 * Guarda una consulta en el CRM. Si ya hay una ficha abierta con el mismo teléfono
 * (que no sea una venta cerrada), suma la consulta a esa ficha. Si no, crea una nueva.
 */
export async function guardarLeadUnificado(
  supabase: SupabaseClient,
  fila: Record<string, unknown>,
  origen?: OrigenLead
): Promise<ResultadoLead> {
  const completa: Record<string, unknown> = { ...fila };
  if (origen) {
    for (const [k, v] of Object.entries(origen)) if (v && !completa[k]) completa[k] = v;
  }

  const tel = normalizarTelefono(String(fila.telefono ?? ""));
  if (tel.length >= 8) {
    const { data: previos, error: errBusqueda } = await supabase
      .from("leads")
      .select("id, estado, observaciones, email, origen, proyecto_id, consultas_unificadas, external_id")
      .eq("telefono_norm", tel)
      .order("creado_en", { ascending: false })
      .limit(10);

    if (!errBusqueda && previos && previos.length > 0) {
      const abierto = previos.find((p) => p.estado !== "vendido");
      if (abierto) {
        const etiqueta = labelOrigen((completa.origen as string) ?? null);
        const detalle = String(fila.observaciones ?? fila.mensaje ?? "").trim();
        const nota = `🔁 Nueva consulta ${fechaHoy()} (${etiqueta})${detalle ? `:\n${detalle}` : ""}`;
        const cambios: Record<string, unknown> = {
          observaciones: [abierto.observaciones, nota].filter(Boolean).join("\n\n"),
          consultas_unificadas: (abierto.consultas_unificadas ?? 0) + 1,
          actualizado_en: new Date().toISOString(),
        };
        if (!abierto.email && fila.email) cambios.email = fila.email;
        if (!abierto.origen && completa.origen) cambios.origen = completa.origen;
        if (!abierto.proyecto_id && fila.proyecto_id) cambios.proyecto_id = fila.proyecto_id;
        if (fila.propiedad_id) cambios.propiedad_id = fila.propiedad_id;
        if (!abierto.external_id && fila.external_id) cambios.external_id = fila.external_id;
        for (const c of ["utm_source", "utm_medium", "utm_campaign", ...COLUMNAS_NUEVAS.filter((x) => x.startsWith("busqueda_"))]) {
          if (completa[c] != null && completa[c] !== "") cambios[c] = completa[c];
        }
        // Una ficha descartada vuelve a abrirse; si pide una visita, avanza a "visita programada".
        const estadoNuevo = String(fila.estado ?? "nuevo");
        if (abierto.estado === "descartado") cambios.estado = estadoNuevo;
        else if (ORDEN_ESTADOS.indexOf(estadoNuevo) > ORDEN_ESTADOS.indexOf(abierto.estado)) cambios.estado = estadoNuevo;

        const { error } = await supabase.from("leads").update(cambios).eq("id", abierto.id);
        if (!error) return { id: abierto.id as string, unificado: true };
        console.error("No se pudo unificar la consulta, se crea una ficha nueva", error);
      } else {
        // Ya compró antes: es una oportunidad nueva, pero se avisa en la ficha.
        completa.observaciones = ["⭐ Ya es cliente (compró antes con este teléfono).", completa.observaciones]
          .filter(Boolean)
          .join("\n");
      }
    }
  }

  let { data, error } = await supabase.from("leads").insert(completa).select("id").single();
  if (error && /column|schema cache/i.test(error.message)) {
    // La base todavía no tiene las columnas nuevas (falta sql-crm-mejoras.sql): se guarda igual.
    ({ data, error } = await supabase.from("leads").insert(sinColumnasNuevas(completa)).select("id").single());
  }
  if (error) return { id: null, unificado: false, error: error.message };
  return { id: (data?.id as string) ?? null, unificado: false };
}
