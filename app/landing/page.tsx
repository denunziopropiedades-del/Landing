import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hablá con nosotros",
  description: "Proyectos en barrios abiertos y cerrados. Hablá con un asesor por WhatsApp.",
  alternates: { canonical: "/landing" },
};

const MENSAJE = encodeURIComponent("Hola! Quiero info sobre los lotes");

const ASESORES = [
  { nombre: "Asesor 1", telefono: "+54 9 11 2742-4512", numero: "5491127424512" },
  { nombre: "Asesor 2", telefono: "+54 9 11 6136-5523", numero: "5491161365523" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#F4F2EC] text-[#1B2A22]">
      <header className="mx-auto flex w-full max-w-[1080px] flex-wrap items-center justify-between gap-4 px-5 py-6">
        <div className="font-display text-xl font-bold tracking-wide">
          MATULOTES <span className="font-medium text-[#4A5A50]">- DESARROLLOS</span>
        </div>
        <div className="text-sm text-[#4A5A50]">Proyectos en barrios Abiertos y Cerrados.</div>
      </header>

      <main className="mx-auto flex w-full max-w-[1080px] flex-1 flex-col items-center gap-5 px-5 pb-16 pt-10 text-center">
        <div className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#0F5C38]">
          Atención por WhatsApp
        </div>
        <h1 className="m-0 max-w-[760px] font-display text-[clamp(2.25rem,6vw,4rem)] font-bold leading-[1.05]">
          Hablá con nosotros y conocé tu próximo lote
        </h1>
        <p className="m-0 max-w-[560px] text-lg leading-relaxed text-[#4A5A50]">
          Elegí un asesor y te respondemos por WhatsApp con precios, planos y formas de pago.
        </p>

        <div className="mt-6 grid w-full max-w-[720px] grid-cols-1 gap-4 sm:grid-cols-2">
          {ASESORES.map((a) => (
            <div
              key={a.numero}
              className="flex flex-col gap-4 rounded-2xl border border-[#DCD8CC] bg-white p-6 text-left"
            >
              <div>
                <div className="font-display text-xl font-bold">{a.nombre}</div>
                <div className="mt-1 text-[15px] text-[#4A5A50]">{a.telefono}</div>
              </div>
              <a
                href={`https://wa.me/${a.numero}?text=${MENSAJE}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[52px] items-center justify-center gap-2.5 rounded-xl bg-[#0F5C38] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#0B4A2D]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 21l2.1-5.4A8.4 8.4 0 1 1 21 11.5z" />
                </svg>
                Hablá con nosotros
              </a>
            </div>
          ))}
        </div>

        <p className="mt-2 text-sm text-[#5E6B63]">Lunes a sábado · Respuesta en el día</p>
      </main>

      <footer className="border-t border-[#DCD8CC] p-5 text-center text-[13px] text-[#5E6B63]">
        © MATULOTES - DESARROLLOS
      </footer>
    </div>
  );
}
