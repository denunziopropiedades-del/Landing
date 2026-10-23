import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import MapaPuntos from "@/components/mapa/MapaPuntos";
import { getSiteTextos } from "@/lib/content";
import { getPuntosMapa } from "@/lib/mapa";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Mapa de propiedades y desarrollos",
  description: "Todas las propiedades en venta y alquiler, campos y desarrollos de De Nunzio Negocios Inmobiliarios en el mapa.",
  alternates: { canonical: "/mapa" },
};

export default async function MapaPage() {
  const [textos, puntos] = await Promise.all([getSiteTextos(), getPuntosMapa()]);
  return (
    <PaginaPortal textos={textos}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Mapa</p>
      <h1 className="mt-1.5 font-display text-3xl font-bold text-brand-black sm:text-4xl">Dónde están nuestras propiedades</h1>
      <p className="mt-1.5 mb-6 text-brand-black/65">Desarrollos, casas en venta y alquiler y campos. Filtrá por tipo y tocá un punto para ver la publicación.</p>
      <MapaPuntos puntos={puntos} alto={640} />
    </PaginaPortal>
  );
}
