import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ListadoPropiedades, { type ParamsListado } from "@/components/propiedades/ListadoPropiedades";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Alquilar",
  description: "Casas y departamentos en alquiler en La Plata, Berisso, Ensenada, Guernica, San Vicente, Brandsen y más.",
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
