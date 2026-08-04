"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import type { EstadoLote, Lote } from "@/types/site";
import { formatUsd } from "@/lib/utils";
import { buildWhatsappUrl } from "@/lib/whatsapp";

const COLOR_ESTADO: Record<EstadoLote, string> = {
  disponible: "#22c55e",
  reservado: "#eab308",
  vendido: "#ef4444",
  no_disponible: "#9ca3af",
};

const LABEL_ESTADO: Record<EstadoLote, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
  no_disponible: "No disponible",
};

export default function MapaLotes({
  imagenMasterplan,
  lotes,
  numero,
}: {
  imagenMasterplan: string;
  lotes: Lote[];
  numero?: string;
}) {
  const [seleccionado, setSeleccionado] = useState<Lote | null>(null);

  const lotesEnMapa = lotes.filter((l) => l.posX !== null && l.posY !== null);
  if (lotesEnMapa.length === 0) return null;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-display text-xl font-bold text-brand-black">Plano interactivo del barrio</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          {(Object.keys(LABEL_ESTADO) as EstadoLote[]).map((estado) => (
            <span key={estado} className="flex items-center gap-1.5 text-brand-black/70">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_ESTADO[estado] }} />
              {LABEL_ESTADO[estado]}
            </span>
          ))}
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imagenMasterplan} alt="Masterplan del barrio" className="w-full select-none" draggable={false} />

        {lotesEnMapa.map((lote) => (
          <button
            key={lote.id}
            type="button"
            onClick={() => setSeleccionado(seleccionado?.id === lote.id ? null : lote)}
            aria-label={`Lote ${lote.manzana}-${lote.numero}, ${LABEL_ESTADO[lote.estado]}`}
            className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-md transition hover:scale-125"
            style={{ left: `${lote.posX}%`, top: `${lote.posY}%`, backgroundColor: COLOR_ESTADO[lote.estado] }}
          >
            {lote.manzana}
          </button>
        ))}

        {seleccionado && (
          <div
            className="absolute z-10 w-60 -translate-x-1/2 rounded-xl border border-black/10 bg-white p-4 shadow-xl"
            style={{
              left: `${Math.min(Math.max(seleccionado.posX ?? 50, 18), 82)}%`,
              top: `${(seleccionado.posY ?? 50) > 55 ? (seleccionado.posY ?? 50) - 5 : (seleccionado.posY ?? 50) + 8}%`,
            }}
          >
            <button
              type="button"
              onClick={() => setSeleccionado(null)}
              aria-label="Cerrar"
              className="absolute right-2 top-2 text-brand-black/40 hover:text-brand-black"
            >
              <X className="h-4 w-4" />
            </button>
            <p className="font-display font-bold text-brand-black">
              Manzana {seleccionado.manzana} — Lote {seleccionado.numero}
            </p>
            <p className="mt-1 text-xs text-brand-black/60">
              {seleccionado.superficieM2} m² ({seleccionado.dimensiones})
            </p>
            <p className="mt-2 font-display text-lg font-bold text-brand-green-700">
              {formatUsd(seleccionado.precioUsd)}
            </p>
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
              style={{ backgroundColor: COLOR_ESTADO[seleccionado.estado] }}
            >
              {LABEL_ESTADO[seleccionado.estado]}
            </span>
            {seleccionado.estado === "disponible" && (
              <a
                href={buildWhatsappUrl(
                  `Hola, me interesa el Lote ${seleccionado.numero} de la Manzana ${seleccionado.manzana} (${seleccionado.superficieM2} m²).`,
                  numero
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex items-center justify-center gap-2 rounded-full bg-brand-green-700 py-2 text-xs font-semibold text-white hover:bg-brand-green-600"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Consultar este lote
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
