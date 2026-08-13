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
  outputFileTracingIncludes: {
    "/api/mercadopago/webhook": ["./node_modules/pdfkit/js/data/**/*"],
    "/api/leads/exportar-pdf": ["./node_modules/pdfkit/js/data/**/*"],
  },
};

export default nextConfig;
