import { getProyectos } from "@/lib/content";
import { coordsDesdeTexto, esLinkCorto, type Coordenadas } from "@/lib/geo";
import { esRural, formatearPrecio, getPropiedades, labelTipo, ubicacionTexto } from "@/lib/propiedades";

export type CategoriaPunto = "venta" | "alquiler" | "campo" | "desarrollo";

export type PuntoMapa = {
  id: string;
  categoria: CategoriaPunto;
  titulo: string;
  detalle: string;
  precio: string | null;
  href: string;
  foto: string | null;
  lat: number;
  lng: number;
  /** true si no hay link de Maps y se ubicó en el centro del partido. */
  aproximado: boolean;
};

/**
 * Sigue un link corto de Google Maps (maps.app.goo.gl/…) hasta el link largo, que trae las
 * coordenadas. Queda en la caché de datos de Vercel por un día.
 */
async function resolverLink(url: string): Promise<Coordenadas | null> {
  let actual = url.trim();
  for (let i = 0; i < 4; i++) {
    const c = coordsDesdeTexto(actual);
    if (c) return c;
    if (i > 0 && !/google\.|goo\.gl|g\.co/i.test(actual)) return null;
    try {
      const r = await fetch(actual, {
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; MatuLotesMapa/1.0)" },
        next: { revalidate: 86400 },
        signal: AbortSignal.timeout(4000),
      });
      const destino = r.headers.get("location");
      // Sin redirección no hay coordenadas confiables: mejor ubicación aproximada que un punto equivocado.
      if (!destino) return null;
      actual = new URL(destino, actual).toString();
    } catch {
      return null;
    }
  }
  return coordsDesdeTexto(actual);
}

async function coordsDe(...fuentes: (string | null | undefined)[]): Promise<Coordenadas | null> {
  for (const f of fuentes) {
    if (!f) continue;
    const directa = coordsDesdeTexto(f);
    if (directa) return directa;
    if (/^https?:\/\//i.test(f) && (esLinkCorto(f) || /google\./i.test(f))) {
      const c = await resolverLink(f);
      if (c) return c;
    }
  }
  return null;
}

/**
 * Publicaciones y desarrollos para el mapa. La ubicación sale SIEMPRE del "Link de Google Maps"
 * cargado en el panel; si no tiene link, no se muestra (nunca se inventa una ubicación).
 */
export async function getPuntosMapa(): Promise<PuntoMapa[]> {
  const [propiedades, proyectos] = await Promise.all([getPropiedades(), getProyectos()]);

  const deProps = await Promise.all(
    propiedades.map(async (p): Promise<PuntoMapa | null> => {
      const c = await coordsDe(p.mapsUrl, p.direccion);
      if (!c) return null;
      const rural = esRural(p.tipo);
      return {
        id: p.id,
        categoria: rural ? "campo" : p.operacion === "venta" ? "venta" : "alquiler",
        titulo: p.titulo,
        detalle: `${labelTipo(p.tipo)} · ${ubicacionTexto(p)}`,
        precio: p.precio ? formatearPrecio(p) : null,
        href: `/propiedades/${p.slug}`,
        foto: p.fotos[0] ?? null,
        lat: c.lat,
        lng: c.lng,
        aproximado: false,
      };
    }),
  );

  const deProyectos = await Promise.all(
    proyectos.map(async (p): Promise<PuntoMapa | null> => {
      const c = await coordsDe(p.ubicacionMapsUrl);
      if (!c) return null;
      return {
        id: p.id,
        categoria: "desarrollo",
        titulo: p.nombre,
        detalle: `Desarrollo · ${p.ubicacion}`,
        precio: null,
        href: `/desarrollos/${p.slug}`,
        foto: p.imagenPortada,
        lat: c.lat,
        lng: c.lng,
        aproximado: false,
      };
    }),
  );

  return [...deProyectos, ...deProps].filter((x): x is PuntoMapa => x !== null);
}
