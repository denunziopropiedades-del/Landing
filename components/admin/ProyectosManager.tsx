"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Building2, Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { eliminarProyectoAction, publicarProyectoAction, upsertProyectoAction } from "@/lib/admin/actions";
import type { Proyecto } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function ProyectoForm({ proyecto, onDone }: { proyecto?: Proyecto; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(upsertProyectoAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {proyecto && <input type="hidden" name="id" value={proyecto.id} />}
      <div>
        <label className={labelClass}>Nombre</label>
        <input name="nombre" defaultValue={proyecto?.nombre} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Slug (URL)</label>
        <input name="slug" defaultValue={proyecto?.slug} placeholder="se genera automáticamente si lo dejás vacío" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Ubicación</label>
        <input name="ubicacion" defaultValue={proyecto?.ubicacion} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Link de Google Maps (opcional, para el mail de confirmación de visita)</label>
        <input
          name="ubicacionMapsUrl"
          defaultValue={proyecto?.ubicacionMapsUrl ?? ""}
          placeholder="https://maps.app.goo.gl/..."
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>WhatsApp (opcional, sino usa el general)</label>
        <input name="whatsappNumero" defaultValue={proyecto?.whatsappNumero ?? ""} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Imagen de portada (URL)</label>
        <input name="imagenPortada" defaultValue={proyecto?.imagenPortada ?? ""} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Descripción</label>
        <textarea name="descripcion" defaultValue={proyecto?.descripcion} required rows={2} className={inputClass} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="destacado" id={`destacado-${proyecto?.id ?? "new"}`} defaultChecked={proyecto?.destacado} />
        <label htmlFor={`destacado-${proyecto?.id ?? "new"}`} className="text-sm text-brand-black/70">
          Destacar en la home
        </label>
      </div>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          <Building2 className="h-4 w-4" />
          {proyecto ? "Guardar cambios" : "Crear proyecto"}
        </button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function ProyectosManager({ proyectos }: { proyectos: Proyecto[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [pending, startTransition] = useTransition();

  const publicar = (id: string, publicado: boolean) => {
    startTransition(() => {
      publicarProyectoAction(id, publicado);
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este proyecto? Se eliminarán también sus lotes, galería y contenido asociado.")) return;
    startTransition(() => {
      eliminarProyectoAction(id);
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-brand-black">Proyectos</h2>
          <button
            type="button"
            onClick={() => setCreando((v) => !v)}
            className="text-sm font-semibold text-brand-green-700 hover:underline"
          >
            {creando ? "Cancelar" : "+ Nuevo proyecto"}
          </button>
        </div>
        {creando && <ProyectoForm onDone={() => setCreando(false)} />}
      </div>

      <div className="space-y-3">
        {proyectos.map((p) => (
          <Fragment key={p.id}>
            <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div>
                <p className="font-semibold text-brand-black">
                  {p.nombre}{" "}
                  {p.destacado && (
                    <span className="ml-2 rounded-full bg-brand-gold-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-gold-700">
                      Destacado
                    </span>
                  )}
                </p>
                <p className="text-xs text-brand-black/50">
                  /proyectos/{p.slug} · {p.ubicacion}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4 text-sm">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => publicar(p.id, !p.publicado)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    p.publicado ? "bg-brand-green-700/10 text-brand-green-700" : "bg-black/5 text-brand-black/50"
                  }`}
                >
                  {p.publicado ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {p.publicado ? "Publicado" : "Sin publicar"}
                </button>
                <button type="button" onClick={() => setEditando(editando === p.id ? null : p.id)} className="text-brand-green-700 hover:underline">
                  <Pencil className="inline h-4 w-4" /> Editar
                </button>
                <button type="button" disabled={pending} onClick={() => eliminar(p.id)} className="text-red-600 hover:underline disabled:opacity-50">
                  <Trash2 className="inline h-4 w-4" /> Eliminar
                </button>
              </div>
            </div>
            {editando === p.id && (
              <div className="rounded-2xl border border-black/5 bg-brand-cream/60 p-5">
                <ProyectoForm proyecto={p} onDone={() => setEditando(null)} />
              </div>
            )}
          </Fragment>
        ))}
        {proyectos.length === 0 && (
          <p className="rounded-2xl border border-black/5 bg-white py-8 text-center text-sm text-brand-black/50 shadow-sm">
            Todavía no hay proyectos cargados.
          </p>
        )}
      </div>
    </div>
  );
}
