"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteLoteAction, upsertLoteAction } from "@/lib/admin/actions";
import { formatUsd } from "@/lib/utils";
import type { LoteTipo } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function LoteForm({ lote, onDone }: { lote?: LoteTipo; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(upsertLoteAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3 sm:grid-cols-6"
    >
      {lote && <input type="hidden" name="id" value={lote.id} />}
      <div className="sm:col-span-2">
        <label className={labelClass}>Nombre</label>
        <input name="nombre" defaultValue={lote?.nombre} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Superficie (m²)</label>
        <input name="superficieM2" type="number" defaultValue={lote?.superficieM2} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Dimensiones</label>
        <input name="dimensiones" defaultValue={lote?.dimensiones} placeholder="10 x 30" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Precio USD</label>
        <input name="precioUsd" type="number" defaultValue={lote?.precioUsd} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Disponibles</label>
        <input name="disponibles" type="number" defaultValue={lote?.disponibles ?? 0} className={inputClass} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="destacado" defaultChecked={lote?.destacado} id={`destacado-${lote?.id ?? "new"}`} />
        <label htmlFor={`destacado-${lote?.id ?? "new"}`} className="text-sm text-brand-black/70">
          Destacar (&quot;Más elegido&quot;)
        </label>
      </div>
      <div className="flex items-end sm:col-span-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {lote ? "Guardar cambios" : "Agregar lote"}
        </button>
        {state && !state.ok && <span className="ml-3 text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function LotesManager({ lotes }: { lotes: LoteTipo[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este lote?")) return;
    startTransition(() => {
      deleteLoteAction(id);
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Agregar nuevo lote</h2>
        <LoteForm />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Superficie</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Disponibles</th>
              <th className="px-4 py-3 font-medium">Destacado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <Fragment key={lote.id}>
                <tr className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3 font-medium">{lote.nombre}</td>
                  <td className="px-4 py-3">{lote.superficieM2} m²</td>
                  <td className="px-4 py-3">{formatUsd(lote.precioUsd)}</td>
                  <td className="px-4 py-3">{lote.disponibles ?? "—"}</td>
                  <td className="px-4 py-3">{lote.destacado ? "Sí" : "No"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditando(editando === lote.id ? null : lote.id)}
                      className="mr-3 text-brand-green-700 hover:underline"
                    >
                      <Pencil className="inline h-4 w-4" /> Editar
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => eliminar(lote.id)}
                      className="text-red-600 hover:underline disabled:opacity-50"
                    >
                      <Trash2 className="inline h-4 w-4" /> Eliminar
                    </button>
                  </td>
                </tr>
                {editando === lote.id && (
                  <tr className="border-b border-black/5 bg-brand-cream/60">
                    <td colSpan={6} className="px-4 py-4">
                      <LoteForm lote={lote} onDone={() => setEditando(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {lotes.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-black/50">
                  Todavía no hay lotes cargados en la base de datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
