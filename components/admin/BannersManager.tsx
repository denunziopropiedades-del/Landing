"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { eliminarBannerAction, upsertBannerAction } from "@/lib/admin/actions";
import type { Banner, Proyecto } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function BannerForm({ proyectos, banner, onDone }: { proyectos: Proyecto[]; banner?: Banner; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(upsertBannerAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <div>
        <label className={labelClass}>Título</label>
        <input name="titulo" defaultValue={banner?.titulo} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Proyecto</label>
        <select name="proyectoId" defaultValue={banner?.proyectoId ?? ""} className={inputClass}>
          <option value="">Global (todos los proyectos)</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Imagen (URL)</label>
        <input name="imagenUrl" defaultValue={banner?.imagenUrl} required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Link de destino (opcional)</label>
        <input name="linkUrl" defaultValue={banner?.linkUrl ?? ""} placeholder="https://..." className={inputClass} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="activo" id={`activo-${banner?.id ?? "new"}`} defaultChecked={banner?.activo ?? true} />
        <label htmlFor={`activo-${banner?.id ?? "new"}`} className="text-sm text-brand-black/70">
          Activo
        </label>
      </div>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          {banner ? "Guardar cambios" : "Agregar banner"}
        </button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function BannersManager({ proyectos, banners }: { proyectos: Proyecto[]; banners: Banner[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este banner?")) return;
    startTransition(() => {
      eliminarBannerAction(id);
    });
  };

  const nombreProyecto = (id: string | null) => proyectos.find((p) => p.id === id)?.nombre ?? "Global";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Nuevo banner</h2>
        <BannerForm proyectos={proyectos} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {banners.map((b) => (
          <Fragment key={b.id}>
            <div className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.imagenUrl} alt={b.titulo} className="h-32 w-full object-cover" />
              <div className="p-4">
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-brand-black/50">
                  {nombreProyecto(b.proyectoId)}
                </span>
                <p className="mt-1 font-semibold text-brand-black">{b.titulo}</p>
                <p className="mt-1 text-xs text-brand-black/50">{b.activo ? "Activo" : "Inactivo"}</p>
                <div className="mt-3 flex gap-3 text-sm">
                  <button type="button" onClick={() => setEditando(editando === b.id ? null : b.id)} className="text-brand-green-700 hover:underline">
                    <Pencil className="inline h-4 w-4" /> Editar
                  </button>
                  <button type="button" disabled={pending} onClick={() => eliminar(b.id)} className="text-red-600 hover:underline disabled:opacity-50">
                    <Trash2 className="inline h-4 w-4" /> Eliminar
                  </button>
                </div>
              </div>
            </div>
            {editando === b.id && (
              <div className="rounded-2xl border border-black/5 bg-brand-cream/60 p-5 sm:col-span-2 lg:col-span-3">
                <BannerForm proyectos={proyectos} banner={b} onDone={() => setEditando(null)} />
              </div>
            )}
          </Fragment>
        ))}
        {banners.length === 0 && (
          <p className="col-span-full rounded-2xl border border-black/5 bg-white py-8 text-center text-sm text-brand-black/50 shadow-sm">
            Todavía no hay banners cargados.
          </p>
        )}
      </div>
    </div>
  );
}
