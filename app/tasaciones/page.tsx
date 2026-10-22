import type { Metadata } from "next";
import { ClipboardCheck, KeyRound, Scale, Wheat } from "lucide-react";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import ConsultaForm from "@/components/propiedades/ConsultaForm";
import { getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Tasaciones",
  description:
    "Tasamos tu casa, departamento o campo para vender o alquilar en La Plata, Corredor Sur, Ruta 3 y 205 y la Ribera. Martillero Público colegiado.",
  alternates: { canonical: "/tasaciones" },
};

const PUNTOS = [
  { icono: Scale, titulo: "Martillero Público", texto: "Matías De Nunzio, Colegio de Martilleros y Corredores Públicos del Depto. Judicial La Plata." },
  { icono: ClipboardCheck, titulo: "Tasación profesional", texto: "Valor de mercado según zona, estado y comparables reales." },
  { icono: KeyRound, titulo: "Venta o alquiler", texto: "Publicamos tu propiedad en tu zona y coordinamos las visitas." },
  { icono: Wheat, titulo: "Campos y chacras", texto: "Venta y arrendamiento por hectárea o por campaña." },
];

export default async function TasacionesPage() {
  const textos = await getSiteTextos();
  return (
    <PaginaPortal textos={textos}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Tasaciones</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-5xl">¿Querés vender o alquilar tu propiedad?</h1>
          <p className="mt-3 max-w-xl text-lg text-brand-black/65">
            Contanos qué tenés y dónde. Te contactamos para coordinar la tasación y armar la publicación.
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
          <p className="mb-4 font-display text-xl font-bold text-brand-black">Pedí tu tasación</p>
          <ConsultaForm modo="tasacion" />
        </div>
      </div>
    </PaginaPortal>
  );
}
