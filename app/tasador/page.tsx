import type { Metadata } from "next";
import { ClipboardCheck, Clock, FileSignature, Scale } from "lucide-react";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import TasadorOnline from "@/components/tasador/TasadorOnline";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Tasador online: calculá cuánto vale tu casa, lote, departamento o campo",
  description:
    "Tasación online gratis en pocos clics para casas, quintas, lotes, departamentos, PH y campos en La Plata, Guernica, San Vicente, Brandsen, Cañuelas, Lobos y toda la zona sur. Informe comparativo firmado por Martillero Público.",
  alternates: { canonical: "/tasador" },
};

const PUNTOS = [
  { icono: Clock, titulo: "En 1 minuto", texto: "Elegís el tipo de propiedad, la zona y la superficie, y ves el valor estimado al instante." },
  { icono: ClipboardCheck, titulo: "Informe comparativo", texto: "En 24 horas te enviamos el informe con propiedades comparables de tu zona." },
  { icono: Scale, titulo: "Martillero Público", texto: "Matías De Nunzio, Mat. 7886, Depto. Judicial La Plata." },
  { icono: FileSignature, titulo: "Firma online", texto: "Si querés vender, firmás la autorización de venta desde tu celular." },
];

export default async function TasadorPage() {
  const textos = await getSiteTextos();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Tasación de inmuebles",
    provider: { "@type": "RealEstateAgent", name: "De Nunzio Negocios Inmobiliarios", telephone: "+54 9 11 2742-4512" },
    offers: { "@type": "Offer", price: "0", priceCurrency: "ARS" },
  };
  return (
    <PaginaPortal textos={textos}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Tasador online</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-5xl">¿Cuánto vale tu propiedad?</h1>
          <p className="mt-3 max-w-xl text-lg text-brand-black/65">
            Casas, quintas, lotes, departamentos, PH y campos. Completá los datos básicos y conocé el valor estimado de venta, sin cargo.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {PUNTOS.map(({ icono: Icono, titulo, texto }) => (
              <div key={titulo} className="flex gap-3 rounded-2xl bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-green-700/10 text-brand-green-700">
                  <Icono className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold text-brand-black">{titulo}</span>
                  <span className="block text-sm text-brand-black/65">{texto}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <TasadorOnline />
        </div>
      </div>
    </PaginaPortal>
  );
}
