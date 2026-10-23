import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Matu Lotes — Admin",
  manifest: "/admin.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Matu Lotes Admin",
  },
  icons: {
    icon: [{ url: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/iconos/apple-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#154a2e",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
