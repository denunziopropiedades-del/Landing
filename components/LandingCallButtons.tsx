"use client";

import { useEffect, useRef, useState } from "react";

type Asesor = { nombre: string; numero: string };

function IconoTelefono({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

/** Botones "Llamar" que primero muestran el aviso de que solo se atienden llamadas tradicionales. */
export default function LandingCallButtons({ asesores }: { asesores: Asesor[] }) {
  const [elegido, setElegido] = useState<Asesor | null>(null);
  const llamarRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!elegido) return;
    llamarRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setElegido(null);
    };
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflowPrevio;
    };
  }, [elegido]);

  return (
    <div className="mt-2 flex flex-col gap-2">
      <p className="m-0 text-center text-sm font-bold text-[#0F1F17]">¿Preferís una llamada?</p>
      <div className="grid grid-cols-2 gap-2">
        {asesores.map((a) => (
          <button
            key={`tel-${a.numero}`}
            type="button"
            onClick={() => setElegido(a)}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-full border-2 border-[#08743E] bg-white px-3 text-sm font-bold text-[#08743E] transition hover:bg-[#08743E] hover:text-white"
          >
            <IconoTelefono />
            Llamar {a.nombre}
          </button>
        ))}
      </div>

      {elegido && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setElegido(null)}
            className="absolute inset-0 cursor-default bg-[#0F1F17]/55"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aviso-llamada-titulo"
            className="relative flex w-full max-w-[480px] flex-col gap-4 rounded-t-[28px] bg-white px-5 pb-7 pt-3 text-left text-[#0F1F17] shadow-2xl sm:rounded-[28px] sm:pt-6"
          >
            <div className="h-[5px] w-10 self-center rounded-full bg-[#D5DED8] sm:hidden" />
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FFF4DB] text-[#8A5A00]">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
              </span>
              <h2 id="aviso-llamada-titulo" className="m-0 text-lg font-extrabold tracking-[0.04em]">
                INFORMACIÓN IMPORTANTE
              </h2>
            </div>
            <p className="m-0 text-[15px] leading-relaxed text-[#3D4F45]">
              Por motivos de seguridad y para garantizar una atención comercial más segura y eficiente, las
              comunicaciones telefónicas se realizan{" "}
              <strong className="text-[#0F1F17]">exclusivamente mediante llamadas telefónicas tradicionales</strong>.
            </p>
            <div className="flex items-center gap-2.5 rounded-[14px] bg-[#FDECEC] px-3.5 py-3 text-[15px] font-bold text-[#8B1C1C]">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
                <circle cx="12" cy="12" r="10" />
                <path d="M4.9 4.9l14.2 14.2" />
              </svg>
              No atendemos llamadas a través de WhatsApp.
            </div>
            <p className="m-0 text-sm leading-relaxed text-[#5B6B62]">
              Agradecemos su comprensión y colaboración. Nuestro objetivo es brindarle una atención profesional,
              personalizada y segura.
            </p>
            <a
              ref={llamarRef}
              href={`tel:+${elegido.numero}`}
              onClick={() => setElegido(null)}
              className="flex min-h-[54px] items-center justify-center gap-2.5 rounded-full bg-[#08743E] text-base font-extrabold text-white transition-colors hover:bg-[#065A30]"
            >
              <IconoTelefono size={18} />
              Entendido, llamar a {elegido.nombre}
            </a>
            <button
              type="button"
              onClick={() => setElegido(null)}
              className="min-h-[44px] text-[15px] font-bold text-[#3D4F45] hover:text-[#0F1F17]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
