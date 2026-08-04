"use client";

import { useActionState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { eliminarProgresoAction, upsertProgresoAction } from "@/lib/admin/actions";
import type { ProgresoItem } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

export default function ProgresoManager({ proyectoId, progreso }: { proyectoId: string; progreso: ProgresoItem[] }) {
  const [state, formAction, pending] = useActionState(upsertProgresoAction, null);
  const [deletePending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta etapa de progreso?")) return;
    startTransition(() => {
      eliminarProgresoAction(id);
    });
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Estado del desarrollo</h2>

      <div className="mb-6 space-y-2">
        {progreso.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-black/5 px-4 py-2.5 text-sm">
            <span className="font-medium text-brand-black">{p.etapa}</span>
            <div className="flex items-center gap-3">
              <span className="text-brand-black/60">{p.porcentaje}%</span>
              <button type="button" disabled={deletePending} onClick={() => eliminar(p.id)} className="text-red-600 hover:underline disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {progreso.length === 0 && <p className="text-sm text-brand-black/50">Sin etapas cargadas.</p>}
      </div>

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="proyectoId" value={proyectoId} />
        <div className="flex-1 min-w-[160px]">
          <label className={labelClass}>Etapa</label>
          <input name="etapa" placeholder="Ej: Calles" required className={inputClass} />
        </div>
        <div className="w-32">
          <label className={labelClass}>Porcentaje</label>
          <input name="porcentaje" type="number" min={0} max={100} required className={inputClass} />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Agregar etapa
        </button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </form>
    </div>
  );
}
