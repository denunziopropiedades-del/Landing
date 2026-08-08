"use client";

import { useMemo, useState, useTransition } from "react";
import { recalcularPosicionesLotesAction } from "@/lib/admin/actions";
import type { EstadoLote, Lote } from "@/types/site";

const COLOR_ESTADO: Record<EstadoLote, string> = {
  disponible: "#22c55e",
  reservado: "#eab308",
  vendido: "#ef4444",
  no_disponible: "#9ca3af",
};

const LOTE_ANCHO_PCT = 1.7;
const LOTE_ALTO_PCT = 12.5;

const inputClass = "w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm";
const labelClass = "mb-1 block text-[11px] font-medium text-brand-black/50";

export default function CalibrarPlanoForm({
  proyectoId,
  imagenMasterplan,
  lotes,
}: {
  proyectoId: string;
  imagenMasterplan?: string;
  lotes: Lote[];
}) {
  const manzanas = useMemo(() => Array.from(new Set(lotes.map((l) => l.manzana))).sort(), [lotes]);

  const [xMin, setXMin] = useState(4);
  const [xMax, setXMax] = useState(96);
  const [bandas, setBandas] = useState(manzanas.map((_, i) => ({ yTop: 15 + i * 26, yBottom: 30 + i * 26 })));
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const actualizarBanda = (idx: number, campo: "yTop" | "yBottom", valor: number) => {
    setBandas((prev) => prev.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)));
  };

  const colWidth = (xMax - xMin) / 51;

  const guardar = () => {
    setMensaje(null);
    startTransition(async () => {
      const res = await recalcularPosicionesLotesAction(proyectoId, { xMin, xMax, bandas });
      setMensaje(res.ok ? "Posiciones actualizadas." : res.error);
    });
  };

  if (!imagenMasterplan) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Calibrar plano interactivo</h2>
        <p className="text-sm text-brand-black/60">
          Subí primero una imagen en Galería → categoría &quot;Masterplan&quot; para poder calibrar las posiciones.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Calibrar plano interactivo</h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Ajustá los números hasta que los recuadros de color queden encastrados sobre los lotes reales de la imagen, y
        tocá &quot;Guardar posiciones&quot;.
      </p>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>X inicial (%)</label>
              <input type="number" value={xMin} onChange={(e) => setXMin(Number(e.target.value))} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>X final (%)</label>
              <input type="number" value={xMax} onChange={(e) => setXMax(Number(e.target.value))} className={inputClass} />
            </div>
          </div>

          {manzanas.map((m, i) => (
            <div key={m} className="rounded-lg border border-black/5 p-2">
              <p className="mb-1.5 text-xs font-semibold text-brand-black/70">Manzana {m}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Fila arriba (Y %)</label>
                  <input
                    type="number"
                    value={bandas[i]?.yTop ?? 0}
                    onChange={(e) => actualizarBanda(i, "yTop", Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Fila abajo (Y %)</label>
                  <input
                    type="number"
                    value={bandas[i]?.yBottom ?? 0}
                    onChange={(e) => actualizarBanda(i, "yBottom", Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={guardar}
            disabled={pending}
            className="w-full rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Guardar posiciones"}
          </button>
          {mensaje && <p className="text-xs text-brand-black/60">{mensaje}</p>}
        </div>

        <div className="relative w-full overflow-hidden rounded-xl border border-black/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagenMasterplan} alt="Masterplan del barrio" className="w-full select-none" draggable={false} />
          {lotes.map((lote) => {
            const bandaIdx = manzanas.indexOf(lote.manzana);
            const banda = bandas[bandaIdx];
            if (!banda) return null;
            const numero = Number(lote.numero);
            const esFilaSuperior = numero >= 1 && numero <= 51;
            const posicion = esFilaSuperior ? numero : 103 - numero;
            const posX = xMin + (posicion - 0.5) * colWidth;
            const posY = esFilaSuperior ? banda.yTop : banda.yBottom;

            return (
              <div
                key={lote.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 border"
                style={{
                  left: `${posX}%`,
                  top: `${posY}%`,
                  width: `${LOTE_ANCHO_PCT}%`,
                  height: `${LOTE_ALTO_PCT}%`,
                  backgroundColor: COLOR_ESTADO[lote.estado],
                  opacity: 0.6,
                  borderColor: "color-mix(in srgb, " + COLOR_ESTADO[lote.estado] + " 70%, black)",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
