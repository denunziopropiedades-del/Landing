import type { MetadataRoute } from "next";
import { getProyectos } from "@/lib/content";
import { getPropiedades } from "@/lib/propiedades";
import { PARTIDOS, ZONAS } from "@/lib/zonas";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [proyectos, propiedades] = await Promise.all([getProyectos(), getPropiedades()]);

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/desarrollos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...["/comprar", "/alquilar", "/campos", "/zonas", "/tasaciones", "/propietarios", "/visitas", "/postulantes"].map((ruta) => ({
      url: `${SITE_URL}${ruta}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...ZONAS.map((z) => ({
      url: `${SITE_URL}/zonas/${z.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...PARTIDOS.map((p) => ({
      url: `${SITE_URL}/inmobiliaria/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...propiedades.map((p) => ({
      url: `${SITE_URL}/propiedades/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...proyectos.map((p) => ({
      url: `${SITE_URL}/desarrollos/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
