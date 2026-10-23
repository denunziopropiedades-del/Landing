/**
 * Coordenadas para el mapa. Sin dependencias de servidor.
 * - Se leen de links de Google Maps (@lat,lng · !3d…!4d… · ?q=lat,lng) o de "lat, lng".
 * - Si una publicación no tiene link, se ubica en el centro de su partido (aproximado).
 */

export type Coordenadas = { lat: number; lng: number };

/** Centro aproximado de cada partido de lib/zonas.ts (cabecera). */
export const CENTRO_PARTIDO: Record<string, Coordenadas> = {
  "la-plata": { lat: -34.9214, lng: -57.9545 },
  berisso: { lat: -34.8728, lng: -57.8856 },
  ensenada: { lat: -34.8605, lng: -57.9125 },
  "presidente-peron": { lat: -34.9135, lng: -58.3843 },
  "san-vicente": { lat: -35.0251, lng: -58.4234 },
  brandsen: { lat: -35.1683, lng: -58.2339 },
  "general-paz": { lat: -35.5173, lng: -58.3181 },
  canuelas: { lat: -35.0516, lng: -58.7608 },
  monte: { lat: -35.4413, lng: -58.8068 },
  lobos: { lat: -35.1853, lng: -59.0946 },
  "roque-perez": { lat: -35.4013, lng: -59.3335 },
  saladillo: { lat: -35.6371, lng: -59.7783 },
  magdalena: { lat: -35.0806, lng: -57.5174 },
  "punta-indio": { lat: -35.3842, lng: -57.3416 },
};

/** Localidades conocidas → partido, para ubicar desarrollos que solo tienen texto ("Guernica, Buenos Aires"). */
const LOCALIDADES: [RegExp, string][] = [
  [/guernica|presidente per[oó]n|pte\.? per[oó]n/i, "presidente-peron"],
  [/alejandro korn|san vicente|domselaar/i, "san-vicente"],
  [/brandsen|jeppener|g[oó]mez/i, "brandsen"],
  [/ranchos|general paz|loma verde|villanueva/i, "general-paz"],
  [/ca[nñ]uelas|uribelarrea|m[aá]ximo paz|alejandro petion/i, "canuelas"],
  [/\bmonte\b|san miguel del monte/i, "monte"],
  [/lobos/i, "lobos"],
  [/roque p[eé]rez/i, "roque-perez"],
  [/saladillo/i, "saladillo"],
  [/magdalena|atalaya|vieytes/i, "magdalena"],
  [/punta indio|ver[oó]nica|pipinas/i, "punta-indio"],
  [/berisso/i, "berisso"],
  [/ensenada|punta lara/i, "ensenada"],
  [/la plata|city bell|gonnet|villa elisa|los hornos|abasto|olmos/i, "la-plata"],
];

export function partidoDesdeTexto(texto: string | null | undefined): string | null {
  if (!texto) return null;
  return LOCALIDADES.find(([re]) => re.test(texto))?.[1] ?? null;
}

const enArgentina = (c: Coordenadas) => c.lat < -21 && c.lat > -56 && c.lng < -53 && c.lng > -74;

/** Coordenadas escritas en un link de Google Maps o como "lat, lng". */
export function coordsDesdeTexto(texto: string | null | undefined): Coordenadas | null {
  if (!texto) return null;
  let t = texto;
  try {
    t = decodeURIComponent(texto);
  } catch {}
  const patrones = [
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/, // el pin exacto del lugar
    /[?&](?:q|query|ll|destination|center|sll)=(-?\d{1,2}\.\d+)\s*,\s*\+?(-?\d{1,3}\.\d+)/,
    /@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/,
    /\/(?:place|search|dir)\/(-?\d{1,2}\.\d+)\s*,\s*\+?(-?\d{1,3}\.\d+)/,
    /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/,
  ];
  for (const re of patrones) {
    const m = re.exec(t);
    if (m) {
      const c = { lat: Number(m[1]), lng: Number(m[2]) };
      if (enArgentina(c)) return c;
    }
  }
  return null;
}

export const esLinkCorto = (url: string) => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|maps\.google\.[a-z.]+\/\?cid)/i.test(url.trim());
