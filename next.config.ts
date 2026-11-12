import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El contenido (galería, testimonios) lo cargan admins de confianza desde
    // el panel y puede venir de cualquier host (Cloudinary, Unsplash, etc.).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // pdfkit necesita sus archivos de métricas de fuentes (.afm) en tiempo de
  // ejecución; sin esto, Vercel no los incluye en el paquete de la función
  // serverless y la generación de PDF falla en silencio en producción.
  // "Proyectos" pasó a llamarse "Desarrollos": los links viejos (anuncios, WhatsApp) siguen funcionando.
  async redirects() {
    return [
      { source: "/proyectos", destination: "/desarrollos", permanent: true },
      { source: "/proyectos/:slug", destination: "/desarrollos/:slug", permanent: true },
    ];
  },
  // Panel de inscripciones de la preventa (página estática en public/preventa/panel.html, con clave propia).
  async rewrites() {
    return [{ source: "/preventa/panel", destination: "/preventa/panel.html" }];
  },
  // pdfkit lee sus fuentes (.afm) desde node_modules: no se empaqueta para que encuentre esos archivos.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/mercadopago/webhook": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/leads/exportar-pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/documentos/pdf": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/alquileres/recibo/[id]": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/alquileres/liquidacion/[id]": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/admin/cobranzas/[leadId]/pagares": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
