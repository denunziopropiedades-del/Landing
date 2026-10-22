import type { Metadata } from "next";
import Link from "next/link";
import AgendaRapida from "@/components/AgendaRapida";
import { getProyectos, getSiteTextos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Agendá tu visita",
  description: "Elegí día y horario y visitá el lote. Sin cargo, todos los días de 8 a 18 hs.",
  alternates: { canonical: "/visitas" },
};

// Los días ("Hoy", "Mañana") y los turnos libres dependen del momento en que se abre la página.
export const dynamic = "force-dynamic";

export default async function VisitasPage({ searchParams }: { searchParams: Promise<{ proyecto?: string }> }) {
  const { proyecto: slug } = await searchParams;
  const [proyectos, textos] = await Promise.all([getProyectos(), getSiteTextos()]);

  // Con ?proyecto=<slug> (por ejemplo desde un anuncio) se muestra solo ese barrio.
  const elegido = slug ? proyectos.find((p) => p.slug === slug) : undefined;
  const lista = elegido ? [elegido] : proyectos;
  const inicial = elegido ?? proyectos.find((p) => p.destacado) ?? proyectos[0];

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-brand-black px-4 pb-8 pt-7 text-center text-white">
        <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand-gold-400">
          Matu Lotes
        </Link>
        <h1 className="mt-2 font-display text-[28px] font-bold leading-tight">
          {lista.length === 1 ? `Visitá ${lista[0].nombre}` : "Agendá tu visita"}
        </h1>
        <p className="mt-1.5 text-sm text-white/70">Sin cargo · Todos los días de 8 a 18 hs</p>
      </header>

      <div className="mx-auto max-w-md px-4 pb-16 pt-7">
        <AgendaRapida
          proyectos={lista.map((p) => ({ id: p.id, nombre: p.nombre, ubicacion: p.ubicacion }))}
          proyectoInicialId={inicial?.id}
          whatsappNumero={textos.whatsappNumero}
        />

        <p className="mt-10 text-center text-xs text-brand-black/45">
          ¿Preferís hablar con alguien?{" "}
          <a href={`https://wa.me/${textos.whatsappNumero}`} target="_blank" rel="noopener noreferrer" className="font-semibold underline">
            Escribinos por WhatsApp
          </a>
        </p>
        <p className="mt-6 text-center text-[11px] uppercase tracking-wide text-brand-black/40">
          Inmobiliaria De Nunzio Negocios Inmobiliarios · Matías De Nunzio, Martillero Público
        </p>
      </div>
    </main>
  );
}
