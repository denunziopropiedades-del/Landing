import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ListadoPropiedades, { type ParamsListado } from "@/components/propiedades/ListadoPropiedades";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Comprar",
  description: "Casas, departamentos, PH, locales y terrenos en venta en La Plata, Corredor Sur, Ruta 3 y 205 y la Ribera.",
  alternates: { canonical: "/comprar" },
};

export default async function Page({ searchParams }: { searchParams: Promise<ParamsListado> }) {
  const [params, textos] = await Promise.all([searchParams, getSiteTextos()]);
  return (
    <PaginaPortal textos={textos}>
      <ListadoPropiedades modo="comprar" basePath="/comprar" params={params} numeroWhatsapp={textos.whatsappNumero} />
    </PaginaPortal>
  );
}
