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
    icon: [{ url: "/api/pwa-icon?size=192", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/api/pwa-icon?size=180", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#154a2e",
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
