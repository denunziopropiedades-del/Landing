import Link from "next/link";
import { ArrowRight, ClipboardCheck, KeyRound, LayoutGrid, Scale, Wheat } from "lucide-react";
import Navbar from "@/components/Navbar";
import Banners from "@/components/Banners";
import ProyectoCard from "@/components/ProyectoCard";
import Testimonios from "@/components/Testimonios";
import Faq from "@/components/Faq";
import Contacto from "@/components/Contacto";
import Footer from "@/components/Footer";
import IntroPortada from "@/components/IntroPortada";
import BuscadorPropiedades from "@/components/propiedades/BuscadorPropiedades";
import ZonasGrid from "@/components/propiedades/ZonasGrid";
import PropiedadCard from "@/components/propiedades/PropiedadCard";
import { getBanners, getFaqs, getProyectos, getSiteTextos, getTestimonios } from "@/lib/content";
import { getConteoPorPartido, getPropiedades, TIPOS_RURALES, TIPOS } from "@/lib/propiedades";

export const revalidate = 60;

const IMAGEN_HERO = "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2400&auto=format&fit=crop";
const TIPOS_URBANOS = TIPOS.filter((t) => !TIPOS_RURALES.includes(t.value)).map((t) => t.value);

export default async function PortalHome() {
  const [proyectos, testimonios, faqs, banners, textos, destacadas, campos, conteo] = await Promise.all([
    getProyectos(),
    getTestimonios(),
    getFaqs(),
    getBanners(),
    getSiteTextos(),
    getPropiedades({ tipos: TIPOS_URBANOS, limite: 8 }),
    getPropiedades({ tipos: TIPOS_RURALES, limite: 4 }),
    getConteoPorPartido(),
  ]);

  const proyectosDestacados = proyectos.filter((p) => p.destacado);
  const desarrollos = (proyectosDestacados.length > 0 ? proyectosDestacados : proyectos).slice(0, 3);

  return (
    <>
      <IntroPortada />
      <Navbar numero={textos.whatsappNumero} />
      <main>
        {/* Portada con buscador */}
        <section id="inicio" className="relative overflow-hidden bg-brand-black">
          <div className="absolute inset-0 bg-cover bg-center opacity-60" style={{ backgroundImage: `url('${IMAGEN_HERO}')` }} aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/80 to-brand-black/30" aria-hidden />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-transparent to-transparent" aria-hidden />
          <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-28 sm:px-6 sm:pb-20 sm:pt-36 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand-gold-400">Inmobiliaria · Departamento Judicial La Plata</p>
            <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
              Tu próxima propiedad, en tu zona.
            </h1>
            <p className="mt-4 max-w-2xl text-lg text-white/75">
              Casas, departamentos y campos en venta y alquiler, y lotes en desarrollos con escritura. 14 partidos, un solo martillero
              público.
            </p>
            <div className="mt-8 max-w-5xl">
              <BuscadorPropiedades />
            </div>
          </div>
        </section>

        <Banners items={banners} numero={textos.whatsappNumero} />

        {/* Zonas */}
        <section className="bg-brand-cream py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Explorá por zona</p>
                <h2 className="mt-1.5 font-display text-3xl font-bold text-brand-black sm:text-4xl">
                  Las 4 zonas del Departamento Judicial La Plata
                </h2>
                <p className="mt-1.5 text-brand-black/65">Agrupamos los 14 partidos de la jurisdicción del Colegio de Martilleros de La Plata.</p>
              </div>
              <Link href="/zonas" className="font-semibold text-brand-green-700 hover:underline">
                Ver todas las zonas →
              </Link>
            </div>
            <div className="mt-8">
              <ZonasGrid conteo={conteo} />
            </div>
          </div>
        </section>

        {/* Propiedades destacadas */}
        {destacadas.length > 0 && (
          <section className="bg-brand-cream pb-16 sm:pb-20">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 className="font-display text-3xl font-bold text-brand-black">Propiedades destacadas</h2>
                <div className="flex gap-2 text-sm font-semibold">
                  <Link href="/comprar" className="rounded-full border border-black/10 bg-white px-4 py-2 hover:border-black/40">
                    En venta
                  </Link>
                  <Link href="/alquilar" className="rounded-full border border-black/10 bg-white px-4 py-2 hover:border-black/40">
                    En alquiler
                  </Link>
                </div>
              </div>
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {destacadas.map((p) => (
                  <PropiedadCard key={p.id} propiedad={p} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Campos */}
        <section className="bg-brand-cream pb-16 sm:pb-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-[28px] bg-gradient-to-br from-[#f3ead2] to-[#e3ecd2] p-6 sm:p-10">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[#6b5a2a]">
                    <Wheat className="h-4 w-4" /> Campos
                  </p>
                  <h2 className="mt-1.5 font-display text-3xl font-bold text-brand-black">Campos en venta y arrendamiento</h2>
                  <p className="mt-1.5 max-w-2xl text-brand-black/65">
                    Agrícolas, ganaderos, mixtos y chacras. Precio por hectárea o total, y arrendamientos por campaña.
                  </p>
                </div>
                <div className="flex gap-2 text-sm font-semibold">
                  <Link href="/campos?operacion=venta" className="rounded-full bg-[#5c4a1c] px-4 py-2 text-white hover:brightness-110">
                    En venta
                  </Link>
                  <Link href="/campos?operacion=alquiler" className="rounded-full border border-black/10 bg-white px-4 py-2 hover:border-black/40">
                    Arrendamiento
                  </Link>
                </div>
              </div>
              {campos.length > 0 ? (
                <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                  {campos.map((p) => (
                    <PropiedadCard key={p.id} propiedad={p} />
                  ))}
                </div>
              ) : (
                <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-white/70 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-brand-black/75">
                    ¿Tenés un campo para vender o arrendar en Lobos, Monte, Saladillo, Roque Pérez, Cañuelas o la Ribera?
                  </p>
                  <Link href="/tasaciones" className="shrink-0 rounded-full bg-brand-black px-5 py-2.5 text-sm font-bold text-white">
                    Pedí tu tasación
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Desarrollos */}
        <section id="desarrollos" className="bg-brand-black py-16 text-white sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-gold-500 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-brand-black">
                  <LayoutGrid className="h-3.5 w-3.5" /> Desarrollos
                </span>
                <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Lotes con escritura garantizada</h2>
                <p className="mt-1.5 text-white/65">Loteos con financiación propia en las zonas de mayor crecimiento.</p>
              </div>
              <Link
                href="/desarrollos"
                className="inline-flex items-center gap-2 rounded-full bg-brand-gold-500 px-6 py-3 font-semibold text-brand-black transition hover:bg-brand-gold-400"
              >
                Ver todos los desarrollos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {desarrollos.map((p) => (
                <ProyectoCard key={p.id} proyecto={p} />
              ))}
            </div>
          </div>
        </section>

        {/* Respaldo */}
        <section className="bg-brand-cream py-14">
          <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
            {[
              {
                icono: Scale,
                titulo: "Martillero Público colegiado",
                texto: "Matías De Nunzio, Colegio de Martilleros y Corredores Públicos del Depto. Judicial La Plata.",
                href: "/zonas",
              },
              {
                icono: ClipboardCheck,
                titulo: "Tasamos tu propiedad",
                texto: "¿Querés vender o alquilar? Te hacemos la tasación y la publicamos en tu zona.",
                href: "/tasaciones",
              },
              {
                icono: KeyRound,
                titulo: "Alquileres con contrato",
                texto: "Casas y departamentos en alquiler con asesoramiento de la inmobiliaria.",
                href: "/alquilar",
              },
            ].map(({ icono: Icono, titulo, texto, href }) => (
              <Link key={titulo} href={href} className="flex gap-4 rounded-2xl border border-black/5 bg-white p-5 transition hover:shadow-md">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green-700/10 text-brand-green-700">
                  <Icono className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold text-brand-black">{titulo}</span>
                  <span className="mt-1 block text-sm text-brand-black/65">{texto}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div id="testimonios">
          <Testimonios testimonios={testimonios} />
        </div>
        <Faq faqs={faqs} />
        <Contacto textos={textos} />
      </main>
      <Footer textos={textos} />
    </>
  );
}
