"use client";

import { useActionState, useTransition } from "react";
import { Building2 } from "lucide-react";
import { addProyectoAction, toggleProyectoActivoAction } from "@/lib/admin/actions";
import type { Proyecto } from "@/lib/admin/data";

export default function ProyectosManager({ proyectos }: { proyectos: Proyecto[] }) {
  const [state, formAction, pending] = useActionState(addProyectoAction, null);
  const [togglePending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Agregar nuevo desarrollo</h2>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-brand-black/70">Nombre del desarrollo</label>
            <input
              name="nombre"
              required
              placeholder="Ej: Ayres de Guernica – Etapa 3"
              className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
          >
            <Building2 className="h-4 w-4" />
            Agregar proyecto
          </button>
          {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
        </form>
        <p className="mt-3 text-xs text-brand-black/50">
          Cada proyecto administra sus propios lotes, precios y contenido de forma independiente.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[500px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Slug</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">{p.nombre}</td>
                <td className="px-4 py-3 text-brand-black/50">{p.slug}</td>
                <td className="px-4 py-3">{p.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={togglePending}
                    onClick={() =>
                      startTransition(() => {
                        toggleProyectoActivoAction(p.id, !p.activo);
                      })
                    }
                    className="text-brand-green-700 hover:underline disabled:opacity-50"
                  >
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
            {proyectos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-brand-black/50">
                  Todavía no hay proyectos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
