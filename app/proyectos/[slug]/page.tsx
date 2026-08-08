import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Navbar, { NAV_LINKS_PROYECTO } from "@/components/Navbar";
import Hero from "@/components/Hero";
import Banners from "@/components/Banners";
import PromoCountdown from "@/components/PromoCountdown";
import LotesGrid from "@/components/LotesGrid";
import MapaLotes from "@/components/MapaLotes";
import Beneficios from "@/components/Beneficios";
import Ubicacion from "@/components/Ubicacion";
import Galeria from "@/components/Galeria";
import ProgresoDesarrollo from "@/components/ProgresoDesarrollo";
import Financiacion from "@/components/Financiacion";
import Testimonios from "@/components/Testimonios";
import Novedades from "@/components/Novedades";
import AgendaVisita from "@/components/AgendaVisita";
import Faq from "@/components/Faq";
import Contacto from "@/components/Contacto";
import Footer from "@/components/Footer";
import ReservaForm from "@/components/ReservaForm";
import { accesos, beneficios } from "@/lib/data";
import {
  agruparLotesPorTipo,
  getBanners,
  getFaqs,
  getFinanciacionConfig,
  getGaleria,
  getLotes,
  getNovedades,
  getProgreso,
  getPromocionActiva,
  getProyectoBySlug,
  getProyectos,
  getSiteTextos,
  getTestimonios,
} from "@/lib/content";

export const revalidate = 60;

type Params = { slug: string };

export async function generateStaticParams() {
  const proyectos = await getProyectos();
  return proyectos.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const proyecto = await getProyectoBySlug(slug);
  if (!proyecto) return {};

  const titulo = `${proyecto.nombre} | Lotes en venta`;
  const descripcion = proyecto.descripcion;

  return {
    title: titulo,
    description: descripcion,
    alternates: { canonical: `/proyectos/${proyecto.slug}` },
    openGraph: {
      title: titulo,
      description: descripcion,
      images: proyecto.imagenPortada ? [{ url: proyecto.imagenPortada }] : undefined,
    },
  };
}

export default async function ProyectoPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const proyecto = await getProyectoBySlug(slug);
  if (!proyecto || !proyecto.publicado) notFound();

  const [lotes, promocion, financiacion, galeria, progreso, testimonios, faqs, novedades, banners, textos] =
    await Promise.all([
      getLotes(proyecto.id),
      getPromocionActiva(proyecto.id),
      getFinanciacionConfig(proyecto.id),
      getGaleria(proyecto.id),
      getProgreso(proyecto.id),
      getTestimonios(proyecto.id),
      getFaqs(proyecto.id),
      getNovedades(proyecto.id),
      getBanners(proyecto.id),
      getSiteTextos(),
    ]);

  const tiposLotes = agruparLotesPorTipo(lotes);
  const numero = proyecto.whatsappNumero ?? textos.whatsappNumero;
  const masterplan = galeria.find((g) => g.categoria === "masterplan")?.url;

  const schema = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: proyecto.nombre,
    description: proyecto.descripcion,
    address: { "@type": "PostalAddress", addressLocality: proyecto.ubicacion, addressCountry: "AR" },
    offers:
      tiposLotes.length > 0
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: Math.min(...tiposLotes.map((t) => t.precioUsd)),
            highPrice: Math.max(...tiposLotes.map((t) => t.precioUsd)),
          }
        : undefined,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <Navbar numero={numero} marca={proyecto.nombre} links={NAV_LINKS_PROYECTO} logoHref={`/proyectos/${proyecto.slug}`} />
      <main>
        <Hero
          eyebrow={proyecto.ubicacion}
          titulo={proyecto.nombre}
          subtitulo={proyecto.descripcion}
          imagenFondo={proyecto.imagenPortada ?? "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2400&auto=format&fit=crop"}
          whatsappMensaje={`Hola, me interesa recibir información sobre ${proyecto.nombre}.`}
          whatsappNumero={numero}
          ctaSecundario={{ label: "Ver lotes disponibles", href: "#lotes" }}
        />
        <Banners items={banners} numero={numero} />
        <PromoCountdown promo={promocion} />
        <LotesGrid tiposLotes={tiposLotes} numero={numero} />

        {masterplan && lotes.some((l) => l.posX !== null) && (
          <section className="bg-brand-cream pb-20 sm:pb-28">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <MapaLotes
                imagenMasterplan={masterplan}
                lotes={lotes}
                numero={numero}
                celdaAnchoPct={proyecto.celdaAnchoPct ?? undefined}
                celdaAltoPct={proyecto.celdaAltoPct ?? undefined}
              />
            </div>
          </section>
        )}

        <Beneficios beneficios={beneficios} />
        <Novedades novedades={novedades} />
        <Ubicacion ubicacion={proyecto.ubicacion} accesos={accesos} />
        <Galeria items={galeria} />
        <ProgresoDesarrollo progreso={progreso} />
        <Financiacion tiposLotes={tiposLotes} config={financiacion} />

        <section id="reserva" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Reserva online</h2>
              <p className="mt-3 text-brand-black/70">
                Asegurá tu lote hoy mismo completando el formulario de reserva.
              </p>
            </div>
            <div className="mt-12">
              <ReservaForm proyectoId={proyecto.id} lotes={lotes} numero={numero} />
            </div>
          </div>
        </section>

        <Testimonios testimonios={testimonios} />
        <AgendaVisita proyectoId={proyecto.id} />
        <Faq faqs={faqs} />
        <Contacto textos={textos} />
      </main>
      <Footer textos={textos} />
    </>
  );
}
