import type { Metadata } from "next";
import Link from "next/link";
import AgendaRapida from "@/components/AgendaRapida";
import { getProyectos, getSiteTextos } from "@/lib/content";
import { esRural, getPropiedadBySlug, getPropiedades, ubicacionTexto, type Propiedad } from "@/lib/propiedades";
import type { OpcionVisita } from "@/components/AgendaRapida";

export const metadata: Metadata = {
  title: "Agendá tu visita",
  description: "Elegí día y horario y visitá el lote. Sin cargo, todos los días de 8 a 18 hs.",
  alternates: { canonical: "/visitas" },
};

// Los días ("Hoy", "Mañana") y los turnos libres dependen del momento en que se abre la página.
export const dynamic = "force-dynamic";

export default async function VisitasPage({ searchParams }: { searchParams: Promise<{ proyecto?: string; propiedad?: string }> }) {
  const { proyecto: slug, propiedad: slugPropiedad } = await searchParams;
  const [proyectos, textos, prop, propiedades] = await Promise.all([
    getProyectos(),
    getSiteTextos(),
    slugPropiedad ? getPropiedadBySlug(slugPropiedad) : Promise.resolve(null),
    slug || slugPropiedad ? Promise.resolve([] as Propiedad[]) : getPropiedades(),
  ]);
  // Con ?propiedad=<slug> (desde la ficha de una propiedad) la visita es a esa propiedad.
  const propiedad = prop
    ? { id: prop.id, titulo: prop.titulo, ubicacion: ubicacionTexto(prop) }
    : undefined;

  // Con ?proyecto=<slug> (por ejemplo desde un anuncio) se muestra solo ese barrio.
  const elegido = slug ? proyectos.find((p) => p.slug === slug) : undefined;
  const lista = elegido ? [elegido] : proyectos;
  const inicial = elegido ?? proyectos.find((p) => p.destacado) ?? proyectos[0];

  // Todo lo visitable, ordenado por grupo: barrios, casas, campos y otras propiedades.
  // Dentro de cada grupo se respeta el orden del panel (destacadas primero). Las vendidas no se muestran.
  const disponibles = propiedades.filter((p) => !p.vendido);
  const deProp = (p: Propiedad, grupo: OpcionVisita["grupo"]): OpcionVisita => ({
    clave: `propiedad:${p.id}`,
    tipo: "propiedad",
    id: p.id,
    grupo,
    nombre: p.titulo,
    ubicacion: [p.operacion === "alquiler" ? "En alquiler" : null, ubicacionTexto(p)].filter(Boolean).join(" · "),
  });
  const opciones: OpcionVisita[] = [
    ...lista.map((p) => ({ clave: `proyecto:${p.id}`, tipo: "proyecto" as const, id: p.id, grupo: "barrios" as const, nombre: p.nombre, ubicacion: p.ubicacion })),
    ...disponibles.filter((p) => ["casa", "departamento", "ph"].includes(p.tipo)).map((p) => deProp(p, "casas")),
    ...disponibles.filter((p) => esRural(p.tipo)).map((p) => deProp(p, "campos")),
    ...disponibles
      .filter((p) => !esRural(p.tipo) && !["casa", "departamento", "ph"].includes(p.tipo))
      .map((p) => deProp(p, "otras")),
  ];

  return (
    <main className="min-h-screen bg-brand-cream">
      <header className="bg-brand-black px-4 pb-8 pt-7 text-center text-white">
        <Link href="/" className="text-xs font-semibold uppercase tracking-widest text-brand-gold-400">
          Matu Lotes
        </Link>
        <h1 className="mt-2 font-display text-[28px] font-bold leading-tight">
          {propiedad ? "Agendá tu visita" : opciones.length === 1 ? `Visitá ${opciones[0].nombre}` : "Agendá tu visita"}
        </h1>
        <p className="mt-1.5 text-sm text-white/70">Sin cargo · Todos los días de 8 a 18 hs</p>
      </header>

      <div className="mx-auto max-w-md px-4 pb-16 pt-7">
        <AgendaRapida
          opciones={propiedad ? [] : opciones}
          opcionInicial={propiedad || !inicial ? undefined : `proyecto:${inicial.id}`}
          whatsappNumero={textos.whatsappNumero}
          propiedad={propiedad}
        />

        <p className="mt-10 text-center text-xs text-brand-black/45">
          ¿Preferís hablar con alguien?{" "}
          <a href="/api/whatsapp" target="_blank" rel="noopener" className="font-semibold underline">
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
