import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import PromoCountdown from "@/components/PromoCountdown";
import LotesGrid from "@/components/LotesGrid";
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
import { accesos, beneficios, faqs, manzanas, progreso } from "@/lib/data";
import {
  getFinanciacionConfig,
  getGaleria,
  getLotes,
  getNovedades,
  getPromocion,
  getSiteTextos,
  getTestimonios,
} from "@/lib/content";

export const revalidate = 60;

export default async function Home() {
  const [lotes, promocion, financiacion, textos, galeria, testimonios, novedades] = await Promise.all([
    getLotes(),
    getPromocion(),
    getFinanciacionConfig(),
    getSiteTextos(),
    getGaleria(),
    getTestimonios(),
    getNovedades(),
  ]);

  return (
    <>
      <Navbar numero={textos.whatsappNumero} />
      <main>
        <Hero textos={textos} />
        <PromoCountdown promo={promocion} />
        <LotesGrid lotes={lotes} numero={textos.whatsappNumero} />
        <Beneficios beneficios={beneficios} />
        <Novedades novedades={novedades} />
        <Ubicacion accesos={accesos} />
        <Galeria items={galeria} />
        <ProgresoDesarrollo progreso={progreso} />
        <Financiacion lotes={lotes} config={financiacion} />

        <section id="reserva" className="bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Reserva online</h2>
              <p className="mt-3 text-brand-black/70">
                Asegurá tu lote hoy mismo completando el formulario de reserva.
              </p>
            </div>
            <div className="mt-12">
              <ReservaForm lotes={lotes} manzanas={manzanas} numero={textos.whatsappNumero} />
            </div>
          </div>
        </section>

        <Testimonios testimonios={testimonios} />
        <AgendaVisita />
        <Faq faqs={faqs} />
        <Contacto textos={textos} />
      </main>
      <Footer textos={textos} />
    </>
  );
}
