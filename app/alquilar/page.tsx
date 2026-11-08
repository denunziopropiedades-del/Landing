import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ListadoPropiedades, { type ParamsListado } from "@/components/propiedades/ListadoPropiedades";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Casas y departamentos en alquiler en La Plata, Guernica y zona sur",
  description: "Alquileres de casas y departamentos en La Plata, City Bell, Berisso, Ensenada, Guernica, San Vicente, Alejandro Korn, Brandsen y más. Inmobiliaria con Martillero Público colegiado.",
  alternates: { canonical: "/alquilar" },
};

export default async function Page({ searchParams }: { searchParams: Promise<ParamsListado> }) {
  const [params, textos] = await Promise.all([searchParams, getSiteTextos()]);
  return (
    <PaginaPortal textos={textos}>
      <ListadoPropiedades modo="alquilar" basePath="/alquilar" params={params} numeroWhatsapp={textos.whatsappNumero} />
    </PaginaPortal>
  );
}
