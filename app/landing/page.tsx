import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import LandingContactForm from "@/components/LandingContactForm";
import LandingCallButtons from "@/components/LandingCallButtons";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hablá con nosotros",
  description: "Proyectos en barrios abiertos y cerrados. Hablá con un asesor por WhatsApp.",
  alternates: { canonical: "/landing" },
};

const MENSAJE = encodeURIComponent("Hola! Quiero info sobre los lotes");

const ASESORES = [
  { nombre: "Asesor 1", iniciales: "A1", telefono: "+54 9 11 2742-4512", numero: "5491127424512", avatar: "bg-[#08743E]" },
  { nombre: "Asesor 2", iniciales: "A2", telefono: "+54 9 11 6136-5523", numero: "5491161365523", avatar: "bg-[#0F1F17]" },
];

const PASOS = [
  { titulo: "Escribinos", texto: "Te pasamos precios y planos." },
  { titulo: "Visitá el lote", texto: "Coordinamos visitas todos los días." },
  { titulo: "Reservá con escritura", texto: "Realizá la seña y firmá durante la semana en la inmobiliaria o escribanía." },
];

export default function LandingPage() {
  return (
    <div className={`${jakarta.className} flex min-h-screen flex-col bg-white text-[#0F1F17]`}>
      <header className="mx-auto flex w-full max-w-[1080px] items-center justify-between gap-4 px-5 py-5">
        <div className="text-lg font-extrabold">
          matulotes<span className="text-[#08743E]">.</span>{" "}
          <span className="text-sm font-medium text-[#5B6B62]">desarrollos</span>
        </div>
        <a href="#contacto" className="py-2.5 text-sm font-bold text-[#08743E] hover:text-[#065A30]">
          Contacto
        </a>
      </header>

      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col px-3 pb-12 sm:px-5">
        {/* Hero + asesores */}
        <section className="grid gap-8 rounded-[28px] bg-[#E8F5EC] px-5 py-8 sm:px-10 sm:py-12 lg:grid-cols-2 lg:items-center">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#08743E]">● Barrios abiertos</span>
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#08743E]">● Barrios cerrados</span>
            </div>
            <h1 className="m-0 text-[clamp(2.25rem,5.5vw,3.5rem)] font-extrabold leading-[1.08] tracking-[-0.02em]">
              Encontrá tu lote y empezá a construir.
            </h1>
            <p className="m-0 text-base leading-relaxed text-[#3D4F45] sm:text-lg">
              Elegí un asesor y te respondemos por WhatsApp en el día.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {ASESORES.map((a) => (
              <a
                key={a.numero}
                href={`https://wa.me/${a.numero}?text=${MENSAJE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-[18px] bg-white px-3.5 py-3 text-[#0F1F17] shadow-sm transition hover:shadow-md"
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-extrabold text-white ${a.avatar}`}
                >
                  {a.iniciales}
                </span>
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-base font-bold">{a.nombre}</span>
                  <span className="text-[13px] text-[#5B6B62]">{a.telefono}</span>
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-[#08743E] px-3.5 py-2.5 text-[13px] font-bold text-white">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
                  </svg>
                  Hablá
                </span>
              </a>
            ))}
            <p className="mt-1 text-center text-[13px] text-[#3D4F45]">Lunes a sábado · Respuesta en el día</p>

            <LandingCallButtons asesores={ASESORES} />
          </div>
        </section>

        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Pasos */}
          <section className="flex flex-col gap-4 px-2">
            <h2 className="m-0 text-[22px] font-extrabold">Así de simple</h2>
            {PASOS.map((p, i) => (
              <div key={p.titulo} className="flex items-start gap-3.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#E8F5EC] font-extrabold text-[#08743E]">
                  {i + 1}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-bold">{p.titulo}</span>
                  <span className="text-sm text-[#5B6B62]">{p.texto}</span>
                </span>
              </div>
            ))}
          </section>

          {/* Formulario */}
          <section id="contacto" className="scroll-mt-6 rounded-[28px] border border-[#DDE7E0] px-5 py-6 sm:px-7">
            <h2 className="m-0 mb-4 text-[22px] font-extrabold">¿Te llamamos?</h2>
            <LandingContactForm />
          </section>
        </div>
      </main>

      <footer className="p-6 text-center text-xs text-[#5B6B62]">© MATULOTES - DESARROLLOS</footer>
    </div>
  );
}
