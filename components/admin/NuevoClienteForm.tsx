"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { crearLeadManualAction } from "@/lib/admin/actions";
import type { Lote, Perfil, Proyecto, Rol } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

export default function NuevoClienteForm({
  proyectos,
  lotes,
  vendedores,
  rolActual,
}: {
  proyectos: Proyecto[];
  lotes: Lote[];
  vendedores: Perfil[];
  rolActual: Rol;
}) {
  const [abierto, setAbierto] = useState(false);
  const [proyectoId, setProyectoId] = useState("");
  const [state, formAction, pending] = useActionState(crearLeadManualAction, null);
  const puedeAsignar = rolActual === "administrador" || rolActual === "supervisor";

  const lotesDelProyecto = useMemo(() => lotes.filter((l) => l.proyectoId === proyectoId), [lotes, proyectoId]);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-brand-black">Cargar cliente manualmente</h2>
        <button type="button" onClick={() => setAbierto((v) => !v)} className="text-sm font-semibold text-brand-green-700 hover:underline">
          {abierto ? "Cancelar" : "+ Agregar cliente"}
        </button>
      </div>

      {abierto && (
        <form
          action={(fd) => {
            formAction(fd);
            setAbierto(false);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-2"
        >
          <div>
            <label className={labelClass}>Nombre</label>
            <input name="nombre" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Apellido</label>
            <input name="apellido" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email</label>
            <input name="email" type="email" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Teléfono</label>
            <input name="telefono" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>DNI (opcional)</label>
            <input name="dni" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Desarrollo</label>
            <select
              name="proyectoId"
              value={proyectoId}
              onChange={(e) => setProyectoId(e.target.value)}
              className={inputClass}
            >
              <option value="">Sin desarrollo</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Manzana / Lote (opcional)</label>
            <select name="loteId" defaultValue="" disabled={!proyectoId} className={inputClass}>
              <option value="">Sin lote puntual</option>
              {lotesDelProyecto.map((l) => (
                <option key={l.id} value={l.id}>
                  Manzana {l.manzana} — Lote {l.numero}
                </option>
              ))}
            </select>
            {proyectoId && lotesDelProyecto.length === 0 && (
              <p className="mt-1 text-[11px] text-brand-black/40">Este desarrollo todavía no tiene lotes cargados.</p>
            )}
          </div>
          {puedeAsignar && (
            <div>
              <label className={labelClass}>Asignar a</label>
              <select name="asignadoA" defaultValue="" className={inputClass}>
                <option value="">Sin asignar</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre ?? v.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="sm:col-span-2">
            <label className={labelClass}>Observaciones</label>
            <textarea name="observaciones" rows={2} className={inputClass} />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Agregar cliente
            </button>
            {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
