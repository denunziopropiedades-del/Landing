"use client";

import { useRef, useState } from "react";
import { Maximize2, MessageCircle, Minus, Plus, RotateCcw, X } from "lucide-react";
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

const ZOOM_MIN = 1;
const ZOOM_MAX = 6;

function clamp(valor: number, min: number, max: number) {
  return Math.min(max, Math.max(min, valor));
}

function Leyenda() {
  return (
    <div className="flex flex-wrap gap-4 text-xs">
      {(Object.keys(LABEL_ESTADO) as EstadoLote[]).map((estado) => (
        <span key={estado} className="flex items-center gap-1.5 text-brand-black/70">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_ESTADO[estado] }} />
          {LABEL_ESTADO[estado]}
        </span>
      ))}
    </div>
  );
}

export default function MapaLotes({
  imagenMasterplan,
  lotes,
  numero,
  celdaAnchoPct = 1.7,
  celdaAltoPct = 12.5,
}: {
  imagenMasterplan: string;
  lotes: Lote[];
  numero?: string;
  celdaAnchoPct?: number;
  celdaAltoPct?: number;
}) {
  const [seleccionado, setSeleccionado] = useState<Lote | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const arrastre = useRef<{ activo: boolean; x: number; y: number }>({ activo: false, x: 0, y: 0 });

  const lotesEnMapa = lotes.filter((l) => l.posX !== null && l.posY !== null);
  if (lotesEnMapa.length === 0) return null;

  const cambiarZoom = (delta: number) => {
    setZoom((z) => {
      const nuevo = clamp(z + delta, ZOOM_MIN, ZOOM_MAX);
      if (nuevo === ZOOM_MIN) setPan({ x: 0, y: 0 });
      return nuevo;
    });
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    cambiarZoom(e.deltaY < 0 ? 0.4 : -0.4);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (zoom <= 1) return;
    arrastre.current = { activo: true, x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!arrastre.current.activo) return;
    setPan({ x: e.clientX - arrastre.current.x, y: e.clientY - arrastre.current.y });
  };

  const onPointerUp = () => {
    arrastre.current.activo = false;
  };

  const abrirExpandido = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setExpandido(true);
  };

  const popup = seleccionado && (
    <div
      className="absolute z-10 w-60 -translate-x-1/2 rounded-xl border border-black/10 bg-white p-4 shadow-xl"
      style={{
        left: `${Math.min(Math.max(seleccionado.posX ?? 50, 18), 82)}%`,
        top: `${(seleccionado.posY ?? 50) > 55 ? (seleccionado.posY ?? 50) - 5 : (seleccionado.posY ?? 50) + 8}%`,
      }}
      onClick={(e) => e.stopPropagation()}
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
      <p className="mt-2 font-display text-lg font-bold text-brand-green-700">{formatUsd(seleccionado.precioUsd)}</p>
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
  );

  const celdas = lotesEnMapa.map((lote) => (
    <button
      key={lote.id}
      type="button"
      onClick={() => setSeleccionado(seleccionado?.id === lote.id ? null : lote)}
      aria-label={`Lote ${lote.manzana}-${lote.numero}, ${LABEL_ESTADO[lote.estado]}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 border transition hover:z-10 hover:brightness-110"
      style={{
        left: `${lote.posX}%`,
        top: `${lote.posY}%`,
        width: `${celdaAnchoPct}%`,
        height: `${celdaAltoPct}%`,
        backgroundColor: COLOR_ESTADO[lote.estado],
        opacity: seleccionado?.id === lote.id ? 0.85 : 0.6,
        borderColor:
          seleccionado?.id === lote.id ? "#fff" : "color-mix(in srgb, " + COLOR_ESTADO[lote.estado] + " 70%, black)",
        borderWidth: seleccionado?.id === lote.id ? 2 : 1,
      }}
    />
  ));

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h3 className="font-display text-xl font-bold text-brand-black">Plano interactivo del barrio</h3>
        <div className="flex flex-wrap items-center gap-4">
          <Leyenda />
          <button
            type="button"
            onClick={abrirExpandido}
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-brand-black/70 hover:border-brand-green-600 hover:text-brand-green-700"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            Agrandar
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-black/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imagenMasterplan}
          alt="Masterplan del barrio"
          className="w-full cursor-zoom-in select-none"
          draggable={false}
          onClick={abrirExpandido}
        />
        {celdas}
        {popup}
      </div>

      {expandido && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setExpandido(false)}
        >
          <button
            type="button"
            onClick={() => setExpandido(false)}
            aria-label="Cerrar"
            className="absolute right-5 top-5 z-10 text-white/80 hover:text-white"
          >
            <X className="h-8 w-8" />
          </button>

          <div className="absolute left-5 top-5 z-10 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
            <div className="flex flex-wrap gap-3 text-[11px]">
              {(Object.keys(LABEL_ESTADO) as EstadoLote[]).map((estado) => (
                <span key={estado} className="flex items-center gap-1.5 text-white/80">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLOR_ESTADO[estado] }} />
                  {LABEL_ESTADO[estado]}
                </span>
              ))}
            </div>
          </div>

          <div
            className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full bg-black/60 p-1.5 backdrop-blur"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => cambiarZoom(-0.6)}
              aria-label="Alejar"
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
              disabled={zoom <= ZOOM_MIN}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="min-w-[3.5rem] text-center text-xs font-medium text-white/80">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => cambiarZoom(0.6)}
              aria-label="Acercar"
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
              disabled={zoom >= ZOOM_MAX}
            >
              <Plus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              aria-label="Restablecer zoom"
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-30"
              disabled={zoom === ZOOM_MIN}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>

          <div
            className="relative h-[88vh] w-full max-w-7xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            onWheel={onWheel}
            onDoubleClick={() => {
              if (zoom > 1) {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              } else {
                setZoom(2.5);
              }
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            style={{ cursor: zoom > 1 ? "grab" : "default" }}
          >
            <div
              className="relative flex h-full w-full items-center justify-center transition-transform duration-100 ease-out"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <div className="relative w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagenMasterplan}
                  alt="Masterplan del barrio"
                  className="w-full select-none"
                  draggable={false}
                />
                {celdas}
                {popup}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
