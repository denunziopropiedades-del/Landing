import type { Metadata } from "next";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import AltaClienteForm from "@/components/alta/AltaClienteForm";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Completá tus datos",
  description: "Cargá tus datos para preparar la documentación de tu operación con De Nunzio Negocios Inmobiliarios.",
  robots: { index: false, follow: false },
};

export default async function AltaPage() {
  const textos = await getSiteTextos();
  return (
    <PaginaPortal textos={textos}>
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">De Nunzio Negocios Inmobiliarios</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-4xl">Completá tus datos</h1>
        <p className="mt-2 text-brand-black/65">
          Con esta información preparamos tu boleto, cesión o contrato. Te lleva un par de minutos.
        </p>
        <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm sm:p-8">
          <AltaClienteForm />
        </div>
      </div>
    </PaginaPortal>
  );
}
