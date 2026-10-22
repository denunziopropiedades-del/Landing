/**
 * Zonas de trabajo: los 14 partidos del Departamento Judicial La Plata
 * (jurisdicción del Colegio de Martilleros y Corredores Públicos de La Plata),
 * agrupados en 4 zonas comerciales.
 */

export type Partido = { slug: string; nombre: string };
export type Zona = {
  slug: string;
  nombre: string;
  descripcion: string;
  /** Clases de color de la tarjeta de zona. */
  color: string;
  partidos: Partido[];
};

export const ZONAS: Zona[] = [
  {
    slug: "gran-la-plata",
    nombre: "Gran La Plata",
    descripcion: "La capital provincial y su conurbano: casas, departamentos y alquileres.",
    color: "bg-[#1c5c39]",
    partidos: [
      { slug: "la-plata", nombre: "La Plata" },
      { slug: "berisso", nombre: "Berisso" },
      { slug: "ensenada", nombre: "Ensenada" },
    ],
  },
  {
    slug: "corredor-sur",
    nombre: "Corredor Sur",
    descripcion: "Guernica, San Vicente y Brandsen: barrios en crecimiento, lotes y chacras.",
    color: "bg-[#9a6b1f]",
    partidos: [
      { slug: "presidente-peron", nombre: "Presidente Perón" },
      { slug: "san-vicente", nombre: "San Vicente" },
      { slug: "brandsen", nombre: "Brandsen" },
      { slug: "general-paz", nombre: "General Paz" },
    ],
  },
  {
    slug: "ruta-3-205",
    nombre: "Ruta 3 y 205",
    descripcion: "Cañuelas, Monte, Lobos, Roque Pérez y Saladillo: campos, chacras y pueblos.",
    color: "bg-[#2f5d8a]",
    partidos: [
      { slug: "canuelas", nombre: "Cañuelas" },
      { slug: "monte", nombre: "Monte" },
      { slug: "lobos", nombre: "Lobos" },
      { slug: "roque-perez", nombre: "Roque Pérez" },
      { slug: "saladillo", nombre: "Saladillo" },
    ],
  },
  {
    slug: "ribera",
    nombre: "Ribera del Río",
    descripcion: "Magdalena y Punta Indio: costa del Río de la Plata y campos.",
    color: "bg-[#7a4a6b]",
    partidos: [
      { slug: "magdalena", nombre: "Magdalena" },
      { slug: "punta-indio", nombre: "Punta Indio" },
    ],
  },
];

export const PARTIDOS: (Partido & { zona: Zona })[] = ZONAS.flatMap((z) => z.partidos.map((p) => ({ ...p, zona: z })));

export function getZona(slug: string | undefined | null) {
  return ZONAS.find((z) => z.slug === slug);
}

export function getPartido(slug: string | undefined | null) {
  return PARTIDOS.find((p) => p.slug === slug);
}

export function nombrePartido(slug: string) {
  return getPartido(slug)?.nombre ?? slug;
}
