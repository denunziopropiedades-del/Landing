"use client";

import { useMemo, useState, useTransition } from "react";
import { recalcularPosicionesBloquesAction } from "@/lib/admin/actions";
import { posicionEnBloque, type BloqueManzana } from "@/lib/masterplan";
import type { EstadoLote, Lote } from "@/types/site";

const COLOR_ESTADO: Record<EstadoLote, string> = {
  disponible: "#22c55e",
  reservado: "#eab308",
  vendido: "#ef4444",
  no_disponible: "#9ca3af",
};

const inputClass = "w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm";
const labelClass = "mb-1 block text-[11px] font-medium text-brand-black/50";

export default function CalibrarPlanoBloquesForm({
  proyectoId,
  imagenMasterplan,
  lotes,
  celdaAnchoPctInicial,
  celdaAltoPctInicial,
}: {
  proyectoId: string;
  imagenMasterplan?: string;
  lotes: Lote[];
  celdaAnchoPctInicial: number;
  celdaAltoPctInicial: number;
}) {
  const manzanas = useMemo(() => Array.from(new Set(lotes.map((l) => l.manzana))).sort(), [lotes]);

  const [celdaAncho, setCeldaAncho] = useState(Math.min(celdaAnchoPctInicial, 3));
  const [celdaAlto, setCeldaAlto] = useState(Math.min(celdaAltoPctInicial, 3));
  const [bloques, setBloques] = useState<BloqueManzana[]>(
    manzanas.map((manzana, i) => {
      const col = i % 5;
      const fila = Math.floor(i / 5);
      return { manzana, x1: 5 + col * 18, y1: 5 + fila * 20, x2: 18 + col * 18, y2: 20 + fila * 20 };
    })
  );
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const actualizarBloque = (idx: number, campo: keyof Omit<BloqueManzana, "manzana">, valor: number) => {
    setBloques((prev) => prev.map((b, i) => (i === idx ? { ...b, [campo]: valor } : b)));
  };

  const guardar = () => {
    setMensaje(null);
    startTransition(async () => {
      const res = await recalcularPosicionesBloquesAction(proyectoId, {
        bloques,
        celdaAnchoPct: celdaAncho,
        celdaAltoPct: celdaAlto,
      });
      setMensaje(res.ok ? "Posiciones actualizadas." : res.error);
    });
  };

  if (!imagenMasterplan) {
    return (
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-display text-lg font-bold text-brand-black">
          Calibrar plano interactivo (manzanas en bloque)
        </h2>
        <p className="text-sm text-brand-black/60">
          Subí primero una imagen en Galería → categoría &quot;Masterplan&quot; para poder calibrar las posiciones.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">
        Calibrar plano interactivo (manzanas en bloque)
      </h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Para planos como Arroyos de San Vicente, donde cada manzana es un bloque con hasta 17 lotes alrededor del
        perímetro. Para cada manzana, marcá el rectángulo (X/Y inicial y final, en % de la imagen) que la encierra —
        el sistema ubica los lotes 1 a 17 solo dentro de ese rectángulo, con el mismo patrón que se ve en el plano.
        Ajustá hasta que los recuadros de color queden encastrados y tocá &quot;Guardar posiciones&quot;.
      </p>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Ancho de celda (%)</label>
              <input
                type="number"
                step="0.1"
                value={celdaAncho}
                onChange={(e) => setCeldaAncho(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Alto de celda (%)</label>
              <input
                type="number"
                step="0.1"
                value={celdaAlto}
                onChange={(e) => setCeldaAlto(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          {manzanas.map((m, i) => (
            <div key={m} className="rounded-lg border border-black/5 p-2">
              <p className="mb-1.5 text-xs font-semibold text-brand-black/70">Manzana {m}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>X inicial (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bloques[i]?.x1 ?? 0}
                    onChange={(e) => actualizarBloque(i, "x1", Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>X final (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bloques[i]?.x2 ?? 0}
                    onChange={(e) => actualizarBloque(i, "x2", Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Y inicial (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bloques[i]?.y1 ?? 0}
                    onChange={(e) => actualizarBloque(i, "y1", Number(e.target.value))}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Y final (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={bloques[i]?.y2 ?? 0}
                    onChange={(e) => actualizarBloque(i, "y2", Number(e.target.value))}
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
          {bloques.map((b) => (
            <div
              key={`bloque-${b.manzana}`}
              className="absolute border-2 border-dashed border-blue-500/60"
              style={{
                left: `${Math.min(b.x1, b.x2)}%`,
                top: `${Math.min(b.y1, b.y2)}%`,
                width: `${Math.abs(b.x2 - b.x1)}%`,
                height: `${Math.abs(b.y2 - b.y1)}%`,
              }}
            />
          ))}
          {lotes.map((lote) => {
            const bloque = bloques.find((b) => b.manzana === lote.manzana);
            if (!bloque) return null;
            const pos = posicionEnBloque(bloque, lote.numero);
            if (!pos) return null;

            return (
              <div
                key={lote.id}
                className="absolute -translate-x-1/2 -translate-y-1/2 border"
                style={{
                  left: `${pos.posX}%`,
                  top: `${pos.posY}%`,
                  width: `${celdaAncho}%`,
                  height: `${celdaAlto}%`,
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
