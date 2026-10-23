import { getProyectos } from "@/lib/content";
import { CENTRO_PARTIDO, coordsDesdeTexto, esLinkCorto, partidoDesdeTexto, type Coordenadas } from "@/lib/geo";
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
      if (!destino) {
        // Sin redirección: a veces las coordenadas vienen en el HTML.
        if (r.ok) return coordsDesdeTexto((await r.text()).match(/@-?\d{1,2}\.\d+,-?\d{1,3}\.\d+/)?.[0] ?? null);
        return null;
      }
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

/** Corre levemente los puntos aproximados del mismo partido para que no queden encimados. */
function desplazar(c: Coordenadas, semilla: string, indice: number): Coordenadas {
  let h = 0;
  for (const ch of semilla) h = (h * 31 + ch.charCodeAt(0)) | 0;
  const ang = ((h >>> 0) % 360) * (Math.PI / 180) + indice;
  const r = 0.012 + (indice % 4) * 0.006; // ~1,3 a 3 km
  return { lat: c.lat + Math.sin(ang) * r, lng: c.lng + Math.cos(ang) * r };
}

/** Todas las publicaciones y desarrollos con su ubicación, para el mapa. */
export async function getPuntosMapa(): Promise<PuntoMapa[]> {
  const [propiedades, proyectos] = await Promise.all([getPropiedades(), getProyectos()]);
  const porPartido = new Map<string, number>();

  const deProps = await Promise.all(
    propiedades.map(async (p): Promise<PuntoMapa | null> => {
      const exacta = await coordsDe(p.mapsUrl, p.direccion);
      let c = exacta;
      if (!c) {
        const centro = CENTRO_PARTIDO[p.partido] ?? CENTRO_PARTIDO[partidoDesdeTexto(p.localidad) ?? ""];
        if (!centro) return null;
        const n = porPartido.get(p.partido) ?? 0;
        porPartido.set(p.partido, n + 1);
        c = desplazar(centro, p.id, n);
      }
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
        aproximado: !exacta,
      };
    }),
  );

  const deProyectos = await Promise.all(
    proyectos.map(async (p): Promise<PuntoMapa | null> => {
      const exacta = await coordsDe(p.ubicacionMapsUrl);
      const partido = partidoDesdeTexto(`${p.ubicacion} ${p.nombre}`);
      const c = exacta ?? (partido ? CENTRO_PARTIDO[partido] : null);
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
        aproximado: !exacta,
      };
    }),
  );

  return [...deProyectos, ...deProps].filter((x): x is PuntoMapa => x !== null);
}
