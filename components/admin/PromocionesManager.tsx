"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { eliminarPromocionAction, upsertPromocionAction } from "@/lib/admin/actions";
import type { Promocion } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function PromocionesManager({ proyectoId, promociones }: { proyectoId: string; promociones: Promocion[] }) {
  const [state, formAction, pending] = useActionState(upsertPromocionAction, null);
  const [deletePending, startTransition] = useTransition();
  const [fechaFinDefault] = useState(() => toLocalDatetime(new Date(Date.now() + 30 * 86400000).toISOString()));

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    startTransition(() => {
      eliminarPromocionAction(id);
    });
  };

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Promociones / contador regresivo</h2>

      <div className="mb-6 space-y-2">
        {promociones.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg border border-black/5 px-4 py-2.5 text-sm">
            <div>
              <span className="font-medium text-brand-black">{p.titulo}</span>
              <span className="ml-2 text-xs text-brand-black/50">hasta {new Date(p.fechaFin).toLocaleString("es-AR")}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${p.activa ? "bg-green-100 text-green-800" : "bg-black/5 text-brand-black/50"}`}>
                {p.activa ? "Activa" : "Inactiva"}
              </span>
              <button type="button" disabled={deletePending} onClick={() => eliminar(p.id)} className="text-red-600 hover:underline disabled:opacity-50">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {promociones.length === 0 && <p className="text-sm text-brand-black/50">Sin promociones cargadas.</p>}
      </div>

      <form action={formAction} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="proyectoId" value={proyectoId} />
        <div className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="activa" id="promo-activa" defaultChecked />
          <label htmlFor="promo-activa" className="text-sm text-brand-black/70">
            Activar esta promoción (y mostrar el contador en la web)
          </label>
        </div>
        <div>
          <label className={labelClass}>Título</label>
          <input name="titulo" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Bajada</label>
          <input name="bajada" required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Fecha y hora de fin</label>
          <input type="datetime-local" name="fechaFin" defaultValue={fechaFinDefault} required className={inputClass} />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Crear promoción
          </button>
        </div>
        {state && !state.ok && <span className="text-xs text-red-600 sm:col-span-2">{state.error}</span>}
      </form>
    </div>
  );
}
