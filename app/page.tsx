import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Banners from "@/components/Banners";
import ProyectoCard from "@/components/ProyectoCard";
import Testimonios from "@/components/Testimonios";
import Faq from "@/components/Faq";
import Contacto from "@/components/Contacto";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getBanners, getFaqs, getProyectos, getSiteTextos, getTestimonios } from "@/lib/content";

export const revalidate = 60;

export default async function PortalHome() {
  const [proyectos, testimonios, faqs, banners, textos] = await Promise.all([
    getProyectos(),
    getTestimonios(),
    getFaqs(),
    getBanners(),
    getSiteTextos(),
  ]);

  const destacados = proyectos.filter((p) => p.destacado);
  const proyectosAMostrar = (destacados.length > 0 ? destacados : proyectos).slice(0, 6);

  return (
    <>
      <Navbar numero={textos.whatsappNumero} />
      <main>
        <Hero
          eyebrow="Plataforma Desarrollos"
          titulo={textos.heroTitulo}
          subtitulo={textos.heroSubtitulo}
          imagenFondo="https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2400&auto=format&fit=crop"
          whatsappMensaje={textos.whatsappMensajeDefault}
          whatsappNumero={textos.whatsappNumero}
          ctaSecundario={{ label: "Ver proyectos", href: "#proyectos" }}
        />

        <Banners items={banners} numero={textos.whatsappNumero} />

        <section id="proyectos" className="bg-brand-cream py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">
                Proyectos disponibles
              </h2>
              <p className="mt-3 text-brand-black/70">
                Lotes con escritura garantizada en las zonas de mayor crecimiento del Gran Buenos Aires.
              </p>
            </div>

            <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {proyectosAMostrar.map((p) => (
                <ProyectoCard key={p.id} proyecto={p} />
              ))}
            </div>

            {proyectos.length === 0 && (
              <p className="mt-14 text-center text-brand-black/50">Todavía no hay proyectos publicados.</p>
            )}

            {proyectos.length > proyectosAMostrar.length && (
              <div className="mt-12 text-center">
                <Link
                  href="/proyectos"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-green-600"
                >
                  Ver todos los proyectos
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            )}
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
