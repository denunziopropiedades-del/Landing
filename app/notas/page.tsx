import type { Metadata } from "next";
import Link from "next/link";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import { getSiteTextos } from "@/lib/content";
import { NOTAS } from "@/lib/notas";

export const metadata: Metadata = {
  title: "Notas y guías inmobiliarias de Zona Sur",
  description:
    "Guías para comprar lotes en cuotas, escriturar, alquilar tu propiedad y elegir inmobiliaria en Zona Sur, Guernica, San Vicente y La Plata.",
  alternates: { canonical: "/notas" },
};

export default async function NotasPage() {
  const textos = await getSiteTextos();

  return (
    <PaginaPortal textos={textos}>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Notas</p>
      <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-5xl">Guías inmobiliarias de Zona Sur</h1>
      <p className="mt-4 max-w-3xl text-lg text-brand-black/75">
        Consejos claros para comprar, vender, alquilar y escriturar, escritos por un Martillero y Corredor Público (Mat. 7886).
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {NOTAS.map((n) => (
          <Link key={n.slug} href={`/notas/${n.slug}`} className="flex flex-col rounded-2xl bg-white p-5 shadow-sm transition hover:shadow-md">
            <h2 className="font-display text-xl font-bold text-brand-black">{n.titulo}</h2>
            <p className="mt-2 flex-1 text-sm text-brand-black/70">{n.resumen}</p>
            <span className="mt-4 text-sm font-semibold text-brand-green-700">Leer nota →</span>
          </Link>
        ))}
      </div>
    </PaginaPortal>
  );
}
