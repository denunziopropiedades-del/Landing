import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProyectoCard from "@/components/ProyectoCard";
import { getProyectos, getSiteTextos } from "@/lib/content";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Proyectos",
  description: "Descubrí todos nuestros desarrollos inmobiliarios disponibles.",
};

export default async function ProyectosPage() {
  const [proyectos, textos] = await Promise.all([getProyectos(), getSiteTextos()]);

  return (
    <>
      <Navbar numero={textos.whatsappNumero} />
      <main className="bg-brand-cream pb-20 pt-32 sm:pb-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="font-display text-4xl font-bold text-brand-black">Nuestros proyectos</h1>
            <p className="mt-3 text-brand-black/70">
              Desarrollos con escritura garantizada en las zonas de mayor crecimiento del Gran Buenos Aires.
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {proyectos.map((p) => (
              <ProyectoCard key={p.id} proyecto={p} />
            ))}
          </div>

          {proyectos.length === 0 && (
            <p className="mt-14 text-center text-brand-black/50">Todavía no hay proyectos publicados.</p>
          )}
        </div>
      </main>
      <Footer textos={textos} />
    </>
  );
}
