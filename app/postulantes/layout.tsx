import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { absolute: "Selección de personal", template: "%s | Selección de personal" },
  robots: { index: false, follow: false },
};

export default function PostulantesRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
