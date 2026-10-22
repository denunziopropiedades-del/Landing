import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import type { SiteTextos } from "@/types/site";

/** Estructura común de las páginas del portal: menú, contenido y pie. */
export default function PaginaPortal({ textos, children }: { textos: SiteTextos; children: React.ReactNode }) {
  return (
    <>
      <Navbar numero={textos.whatsappNumero} />
      <main className="min-h-screen bg-brand-cream pb-20 pt-24 sm:pt-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <Footer textos={textos} />
    </>
  );
}
