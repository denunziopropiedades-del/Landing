import type { Metadata } from "next";
import { GraduationCap, HandCoins, MapPinned, TrendingUp } from "lucide-react";
import PaginaPortal from "@/components/propiedades/PaginaPortal";
import PostulanteForm from "@/components/PostulanteForm";
import { getSiteTextos } from "@/lib/content";
import { GRUPOS_PUESTOS, PUESTOS } from "@/lib/postulantes";

export const metadata: Metadata = {
  title: "Trabajá con nosotros",
  description:
    "Sumate al equipo de De Nunzio Negocios Inmobiliarios: asesores comerciales, venta de lotes, abogados, agrimensores, martilleros, albañiles y pintores en Zona Sur.",
  alternates: { canonical: "/postulantes" },
};

const PUNTOS = [
  { icono: HandCoins, titulo: "Comisiones competitivas", texto: "Ganás por cada operación que cerrás, con liquidación clara y en término." },
  { icono: GraduationCap, titulo: "Capacitación", texto: "Te formamos en ventas, tasaciones y el día a día de la inmobiliaria." },
  { icono: MapPinned, titulo: "Desarrollos propios", texto: "Lotes, casas y campos en San Vicente, Guernica, Brandsen, Cañuelas y más." },
  { icono: TrendingUp, titulo: "Consultas todos los días", texto: "Trabajás con consultas reales que llegan desde la web y las redes." },
];

export default async function PostulantesPage({ searchParams }: { searchParams: Promise<{ puesto?: string }> }) {
  const [textos, { puesto }] = await Promise.all([getSiteTextos(), searchParams]);
  const puestoInicial = PUESTOS.some((p) => p.value === puesto) ? puesto! : "";

  return (
    <PaginaPortal textos={textos}>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Trabajá con nosotros</p>
          <h1 className="mt-2 font-display text-3xl font-bold text-brand-black sm:text-5xl">Sumate a nuestro equipo</h1>
          <p className="mt-3 max-w-xl text-lg text-brand-black/65">
            Buscamos personas con ganas de crecer en el rubro inmobiliario, profesionales para nuestras operaciones y
            gente de construcción para nuestros desarrollos. Completá el formulario, adjuntá tu CV y te contactamos si tu perfil
            coincide con lo que buscamos.
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

          <div className="mt-8">
            <p className="font-display text-lg font-bold text-brand-black">Puestos</p>
            {GRUPOS_PUESTOS.map((g) => (
              <div key={g} className="mt-3">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-black/50">{g}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {PUESTOS.filter((p) => p.grupo === g).map((p) => (
                    <a
                      key={p.value}
                      href={`/postulantes?puesto=${p.value}#formulario`}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        p.value === puestoInicial
                          ? "bg-brand-green-700 text-white"
                          : "bg-white text-brand-black/75 hover:bg-brand-green-700/10 hover:text-brand-green-700"
                      }`}
                    >
                      {p.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div id="formulario" className="scroll-mt-28 rounded-3xl bg-white p-6 shadow-sm sm:p-8">
          <p className="mb-4 font-display text-xl font-bold text-brand-black">Dejanos tu postulación</p>
          <PostulanteForm key={puestoInicial} puestoInicial={puestoInicial} />
        </div>
      </div>
    </PaginaPortal>
  );
}
