"use client";

import { useActionState } from "react";
import { upsertComboLotesAction } from "@/lib/admin/actions";
import type { ComboLotes } from "@/types/site";

const inputClass = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

export default function ComboLotesForm({ proyectoId, combo }: { proyectoId: string; combo: ComboLotes }) {
  const [state, formAction, pending] = useActionState(upsertComboLotesAction, null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Precio por combinar lotes</h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Para el cliente que quiere comprar 2 o 3 lotes juntos en una sola operación. Se muestra como cuadro de
        precios en el sitio público. Dejá el precio vacío para no mostrar esa opción.
      </p>
      <form action={formAction} className="grid gap-4 sm:grid-cols-3">
        <input type="hidden" name="proyectoId" value={proyectoId} />
        <div>
          <label className={labelClass}>Texto</label>
          <input name="label1Lote" defaultValue={combo.label1Lote} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Texto</label>
          <input name="label2Lotes" defaultValue={combo.label2Lotes} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Texto</label>
          <input name="label3Lotes" defaultValue={combo.label3Lotes} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Precio (USD)</label>
          <input type="number" name="precio1LoteUsd" defaultValue={combo.precio1LoteUsd ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Precio (USD)</label>
          <input type="number" name="precio2LotesUsd" defaultValue={combo.precio2LotesUsd ?? ""} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Precio (USD)</label>
          <input type="number" name="precio3LotesUsd" defaultValue={combo.precio3LotesUsd ?? ""} className={inputClass} />
        </div>
        <div className="flex items-end gap-3 sm:col-span-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
          {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
        </div>
      </form>
    </div>
  );
}
