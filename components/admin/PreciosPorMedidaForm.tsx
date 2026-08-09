"use client";

import { useMemo, useState, useTransition } from "react";
import { Save } from "lucide-react";
import { actualizarPrecioPorMedidaAction } from "@/lib/admin/actions";
import type { Lote } from "@/types/site";

const inputClass = "w-full rounded-lg border border-black/10 px-2 py-1.5 text-sm";
const labelClass = "mb-1 block text-[11px] font-medium text-brand-black/50";

function FilaMedida({ proyectoId, dimensiones, cantidad, referencia }: { proyectoId: string; dimensiones: string; cantidad: number; referencia: Lote }) {
  const [precioUsd, setPrecioUsd] = useState(referencia.precioUsd.toString());
  const [anticipoUsd, setAnticipoUsd] = useState(referencia.anticipoFinanciadoUsd?.toString() ?? "");
  const [cuotas, setCuotas] = useState(referencia.cuotasFinanciado?.toString() ?? "");
  const [valorCuotaUsd, setValorCuotaUsd] = useState(referencia.valorCuotaFinanciadoUsd?.toString() ?? "");
  const [pending, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<string | null>(null);

  const guardar = () => {
    setMensaje(null);
    startTransition(async () => {
      const res = await actualizarPrecioPorMedidaAction(proyectoId, dimensiones, precioUsd, anticipoUsd, cuotas, valorCuotaUsd);
      setMensaje(res.ok ? `Actualizado en ${cantidad} lote${cantidad === 1 ? "" : "s"}.` : res.error);
    });
  };

  return (
    <div className="rounded-xl border border-black/5 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-brand-black">
          {dimensiones} <span className="font-normal text-brand-black/50">({referencia.superficieM2} m² · {cantidad} lotes)</span>
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div>
          <label className={labelClass}>Precio (USD)</label>
          <input type="number" value={precioUsd} onChange={(e) => setPrecioUsd(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Anticipo fijo (USD)</label>
          <input type="number" value={anticipoUsd} onChange={(e) => setAnticipoUsd(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Cantidad de cuotas</label>
          <input type="number" value={cuotas} onChange={(e) => setCuotas(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Valor de cuota (USD)</label>
          <input type="number" value={valorCuotaUsd} onChange={(e) => setValorCuotaUsd(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={guardar}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-700 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          <Save className="h-3.5 w-3.5" />
          {pending ? "Guardando..." : "Guardar esta medida"}
        </button>
        {mensaje && <p className="text-xs text-brand-black/60">{mensaje}</p>}
      </div>
    </div>
  );
}

export default function PreciosPorMedidaForm({ proyectoId, lotes }: { proyectoId: string; lotes: Lote[] }) {
  const medidas = useMemo(() => {
    const mapa = new Map<string, { cantidad: number; referencia: Lote }>();
    for (const lote of lotes) {
      const actual = mapa.get(lote.dimensiones);
      if (actual) actual.cantidad += 1;
      else mapa.set(lote.dimensiones, { cantidad: 1, referencia: lote });
    }
    return Array.from(mapa.entries())
      .map(([dimensiones, v]) => ({ dimensiones, ...v }))
      .sort((a, b) => a.referencia.superficieM2 - b.referencia.superficieM2);
  }, [lotes]);

  if (medidas.length === 0) return null;

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Precios y financiación por medida</h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Cambiá el precio (y opcionalmente un plan fijo de anticipo/cuotas) de una sola vez para todos los lotes que
        comparten la misma medida — evita tener que editar lote por lote, y agrupa la tarjeta en el sitio público.
      </p>
      <div className="space-y-3">
        {medidas.map((m) => (
          <FilaMedida key={m.dimensiones} proyectoId={proyectoId} dimensiones={m.dimensiones} cantidad={m.cantidad} referencia={m.referencia} />
        ))}
      </div>
    </div>
  );
}
