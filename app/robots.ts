import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/preventa/panel", "/cliente", "/verificar", "/mis-cuotas", "/mi-alquiler", "/firma"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
