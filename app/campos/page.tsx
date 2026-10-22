import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ListadoPropiedades, { type ParamsListado } from "@/components/propiedades/ListadoPropiedades";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Campos",
  description: "Campos y chacras en venta y arrendamiento en Lobos, Monte, Saladillo, Roque Pérez, Cañuelas, Magdalena y más.",
  alternates: { canonical: "/campos" },
};

export default async function Page({ searchParams }: { searchParams: Promise<ParamsListado> }) {
  const [params, textos] = await Promise.all([searchParams, getSiteTextos()]);
  return (
    <PaginaPortal textos={textos}>
      <ListadoPropiedades modo="campos" basePath="/campos" params={params} numeroWhatsapp={textos.whatsappNumero} />
    </PaginaPortal>
  );
}
