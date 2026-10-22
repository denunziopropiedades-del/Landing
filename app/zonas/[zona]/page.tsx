import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ListadoPropiedades, { type ParamsListado } from "@/components/propiedades/ListadoPropiedades";
import { getSiteTextos } from "@/lib/content";
import { getZona, ZONAS } from "@/lib/zonas";

type Params = { zona: string };

export function generateStaticParams() {
  return ZONAS.map((z) => ({ zona: z.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const zona = getZona((await params).zona);
  if (!zona) return {};
  return {
    title: `Propiedades en ${zona.nombre}`,
    description: `Casas, departamentos, campos y lotes en venta y alquiler en ${zona.partidos.map((p) => p.nombre).join(", ")}.`,
    alternates: { canonical: `/zonas/${zona.slug}` },
  };
}

export default async function ZonaPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<ParamsListado>;
}) {
  const [{ zona: slug }, sp, textos] = await Promise.all([params, searchParams, getSiteTextos()]);
  const zona = getZona(slug);
  if (!zona) notFound();
  return (
    <PaginaPortal textos={textos}>
      <p className="mb-6 max-w-2xl rounded-2xl bg-white px-5 py-4 text-sm text-brand-black/70">{zona.descripcion}</p>
      <ListadoPropiedades
        modo="zona"
        basePath={`/zonas/${zona.slug}`}
        params={sp}
        zonaFija={zona.slug}
        numeroWhatsapp={textos.whatsappNumero}
      />
    </PaginaPortal>
  );
}
