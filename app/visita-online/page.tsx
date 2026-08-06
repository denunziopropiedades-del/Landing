import type { Metadata } from "next";
import Link from "next/link";
import AgendaVisita from "@/components/AgendaVisita";
import { getProyectoBySlug, getProyectos } from "@/lib/content";

export const metadata: Metadata = {
  title: "Agendá tu visita online",
  robots: { index: false, follow: false },
};

export default async function VisitaOnlinePage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: slug } = await searchParams;

  if (slug) {
    const proyecto = await getProyectoBySlug(slug);
    return (
      <main className="min-h-screen bg-brand-cream">
        <header className="bg-brand-black py-10 text-center text-white">
          <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand-gold-400">
            Matu Lotes
          </Link>
          <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
            {proyecto?.nombre ?? "Agendá tu visita"}
          </h1>
          {proyecto?.ubicacion && <p className="mt-1 text-sm text-white/70">{proyecto.ubicacion}</p>}
        </header>

        <AgendaVisita proyectoId={proyecto?.id} />

        <p className="pb-10 text-center text-xs text-brand-black/40">
          <Link href="/" className="underline">
            Ver el sitio completo
          </Link>
        </p>
      </main>
    );
  }

  const proyectos = await getProyectos();
  const destacado = proyectos.find((p) => p.destacado) ?? proyectos[0] ?? null;
  const varios = proyectos.length > 1;

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-brand-black py-10 text-center text-white">
        <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand-gold-400">
          Matu Lotes
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">
          {varios ? "Agendá tu visita" : (destacado?.nombre ?? "Agendá tu visita")}
        </h1>
        {!varios && destacado?.ubicacion && <p className="mt-1 text-sm text-white/70">{destacado.ubicacion}</p>}
      </header>

      <AgendaVisita proyectoId={destacado?.id} proyectos={varios ? proyectos : undefined} />

      <p className="pb-10 text-center text-xs text-brand-black/40">
        <Link href="/" className="underline">
          Ver el sitio completo
        </Link>
      </p>
    </main>
  );
}
