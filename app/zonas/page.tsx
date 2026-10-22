import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ZonasGrid from "@/components/propiedades/ZonasGrid";
import { getSiteTextos } from "@/lib/content";
import { getConteoPorPartido } from "@/lib/propiedades";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Zonas",
  description:
    "Trabajamos en los 14 partidos del Departamento Judicial La Plata: Gran La Plata, Corredor Sur, Ruta 3 y 205 y Ribera del Río.",
  alternates: { canonical: "/zonas" },
};

export default async function ZonasPage() {
  const [textos, conteo] = await Promise.all([getSiteTextos(), getConteoPorPartido()]);
  return (
    <PaginaPortal textos={textos}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Dónde trabajamos</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-4xl">Las 4 zonas del Departamento Judicial La Plata</h1>
      <p className="mt-2 max-w-2xl text-brand-black/65">
        Agrupamos los 14 partidos de la jurisdicción del Colegio de Martilleros y Corredores Públicos de La Plata para que encuentres
        más fácil lo que buscás.
      </p>
      <div className="mt-8">
        <ZonasGrid conteo={conteo} />
      </div>
    </PaginaPortal>
  );
}
