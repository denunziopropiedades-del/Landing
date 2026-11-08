import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, FileSignature, Home, Wallet } from "lucide-react";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ConsultaForm from "@/components/propiedades/ConsultaForm";
import { getSiteTextos } from "@/lib/content";
import { PARTIDOS } from "@/lib/zonas";

export const metadata: Metadata = {
  title: "Alquilá o vendé tu casa, departamento o campo | Administración de alquileres",
  description:
    "¿Querés alquilar o vender tu propiedad? Tasación sin cargo, publicación, inquilinos con garantía, contratos, cobro mensual y liquidación al propietario en La Plata, Guernica, San Vicente, Brandsen y zona sur. Martillero Público colegiado.",
  alternates: { canonical: "/propietarios" },
};

const SERVICIOS = [
  { icono: BadgeCheck, titulo: "Tasación sin cargo", texto: "Valor real de venta o de alquiler según zona, estado y comparables." },
  { icono: Home, titulo: "Publicación y visitas", texto: "Fotos, publicación en la web y redes, y visitas coordinadas con interesados." },
  { icono: FileSignature, titulo: "Contrato y garantías", texto: "Selección de inquilinos, verificación de garantías y contrato de locación." },
  { icono: Wallet, titulo: "Cobro y liquidación mensual", texto: "Cobramos el alquiler, te liquidamos cada mes y tenés todo online." },
];

export default async function PropietariosPage() {
  const textos = await getSiteTextos();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Administración de alquileres y venta de propiedades",
    provider: { "@type": "RealEstateAgent", name: "De Nunzio Negocios Inmobiliarios", telephone: "+54 9 11 2742-4512" },
    areaServed: PARTIDOS.map((p) => ({ "@type": "City", name: p.nombre })),
  };
  return (
    <PaginaPortal textos={textos}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="max-w-3xl font-display text-3xl font-bold text-brand-black sm:text-4xl">
        Alquilá o vendé tu casa, departamento o campo con una inmobiliaria que se ocupa de todo
      </h1>
      <p className="mt-4 max-w-2xl text-brand-black/80">
        Somos De Nunzio Negocios Inmobiliarios, a cargo de Matías De Nunzio, Martillero Público y Corredor Público (Matrícula COL 7886).
        Trabajamos en La Plata, Guernica, San Vicente, Brandsen, Cañuelas, Lobos, Monte, Saladillo y toda la zona sur.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SERVICIOS.map((s) => (
          <div key={s.titulo} className="rounded-2xl bg-white p-5 shadow-sm">
            <s.icono className="h-6 w-6 text-brand-green-700" />
            <p className="mt-2 font-bold text-brand-black">{s.titulo}</p>
            <p className="mt-1 text-sm text-brand-black/70">{s.texto}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-2xl font-bold text-brand-black">Contanos de tu propiedad</h2>
          <p className="mt-2 text-sm text-brand-black/70">
            Dejanos tus datos y te contactamos para coordinar la tasación. Sin compromiso.
          </p>
          <div className="mt-4">
            <ConsultaForm modo="tasacion" />
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-display text-xl font-bold text-brand-black">Trabajamos en</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {PARTIDOS.map((p) => (
              <Link key={p.slug} href={`/inmobiliaria/${p.slug}`} className="rounded-full bg-brand-cream px-3 py-1 text-sm text-brand-black/80">
                {p.nombre}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PaginaPortal>
  );
}
