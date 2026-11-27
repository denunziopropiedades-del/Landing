import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Resumen del catálogo (desarrollos con lotes y propiedades publicadas) para el asistente.
 * Solo datos reales de la base: el asistente no puede inventar precios ni disponibilidad.
 */

export const SITIO = (process.env.NEXT_PUBLIC_SITE_URL || "https://matulotes.app").replace(/\/$/, "");

const usd = (n: number | null | undefined) =>
  n == null ? "" : `USD ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(n))}`;

export type ItemCatalogo = { tipo: "desarrollo" | "propiedad"; id: string; titulo: string; linea: string };

export async function armarCatalogo(supabase: SupabaseClient): Promise<{ texto: string; items: ItemCatalogo[] }> {
  const [{ data: proyectos }, { data: lotes }, { data: props }] = await Promise.all([
    supabase.from("proyectos").select("id, nombre, slug, ubicacion, descripcion, mostrar_precios").eq("publicado", true).order("orden"),
    supabase
      .from("lotes")
      .select("proyecto_id, estado, precio_usd, superficie_m2, dimensiones, anticipo_financiado_usd, cuotas_financiado, valor_cuota_financiado_usd")
      .eq("estado", "disponible")
      .limit(5000),
    supabase
      .from("propiedades")
      .select("id, slug, titulo, operacion, tipo, localidad, partido, precio, moneda, precio_unidad, ambientes, dormitorios, sup_total, hectareas, financiacion_directa, anticipo, apto_credito, descripcion")
      .eq("publicado", true)
      .or("vendido.is.null,vendido.eq.false")
      .order("orden")
      .limit(60),
  ]);

  const items: ItemCatalogo[] = [];
  const lineas: string[] = [];

  for (const p of proyectos ?? []) {
    const ls = (lotes ?? []).filter((l) => l.proyecto_id === p.id);
    const precios = ls.map((l) => Number(l.precio_usd)).filter((n) => n > 0);
    const conCuotas = ls.find((l) => l.cuotas_financiado && l.valor_cuota_financiado_usd);
    const sup = ls.find((l) => l.dimensiones || l.superficie_m2);
    const partes = [
      `Desarrollo "${p.nombre}"`,
      p.ubicacion ? `ubicación: ${p.ubicacion}` : null,
      `lotes disponibles: ${ls.length}`,
      sup ? `medidas típicas: ${sup.dimensiones || `${sup.superficie_m2} m²`}` : null,
      p.mostrar_precios && precios.length
        ? `precio contado: ${usd(Math.min(...precios))}${Math.max(...precios) !== Math.min(...precios) ? ` a ${usd(Math.max(...precios))}` : ""}`
        : "precios: se informan por asesor (no los des)",
      p.mostrar_precios && conCuotas
        ? `financiado: anticipo ${usd(conCuotas.anticipo_financiado_usd)} y ${conCuotas.cuotas_financiado} cuotas de ${usd(conCuotas.valor_cuota_financiado_usd)}`
        : null,
      `link: ${SITIO}/desarrollos/${p.slug}`,
      `id: ${p.id}`,
    ].filter(Boolean);
    const linea = partes.join(" · ");
    lineas.push(`- ${linea}${p.descripcion ? `\n  Descripción: ${String(p.descripcion).replace(/\s+/g, " ").slice(0, 400)}` : ""}`);
    items.push({ tipo: "desarrollo", id: p.id as string, titulo: p.nombre as string, linea });
  }

  for (const pr of props ?? []) {
    const precio =
      pr.precio == null
        ? "consultar"
        : `${pr.moneda === "USD" ? "USD" : "$"} ${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Number(pr.precio))}${
            { mes: " por mes", ha: " por ha", ha_anio: " por ha/año" }[pr.precio_unidad as string] ?? ""
          }`;
    const partes = [
      `${pr.tipo} en ${pr.operacion} "${pr.titulo}"`,
      [pr.localidad, pr.partido].filter(Boolean).join(", ") || null,
      `precio: ${precio}`,
      pr.ambientes ? `${pr.ambientes} ambientes` : null,
      pr.dormitorios ? `${pr.dormitorios} dormitorios` : null,
      pr.sup_total ? `${pr.sup_total} m²` : null,
      pr.hectareas ? `${pr.hectareas} ha` : null,
      pr.financiacion_directa ? `financiación directa${pr.anticipo ? ` (anticipo ${usd(pr.anticipo)})` : ""}` : null,
      pr.apto_credito ? "apto crédito" : null,
      `link: ${SITIO}/propiedades/${pr.slug}`,
      `id: ${pr.id}`,
    ].filter(Boolean);
    const linea = partes.join(" · ");
    lineas.push(`- ${linea}${pr.descripcion ? `\n  Descripción: ${String(pr.descripcion).replace(/\s+/g, " ").slice(0, 300)}` : ""}`);
    items.push({ tipo: "propiedad", id: pr.id as string, titulo: pr.titulo as string, linea });
  }

  return { texto: lineas.join("\n") || "(No hay productos publicados en este momento.)", items };
}
