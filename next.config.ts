import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // El contenido (galería, testimonios) lo cargan admins de confianza desde
    // el panel y puede venir de cualquier host (Cloudinary, Unsplash, etc.).
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
