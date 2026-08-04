import type { MetadataRoute } from "next";
import { getProyectos } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ayresdeguernica.com.ar";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const proyectos = await getProyectos();

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/proyectos`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...proyectos.map((p) => ({
      url: `${SITE_URL}/proyectos/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
