"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import { deleteTestimonioAction, upsertTestimonioAction } from "@/lib/admin/actions";
import type { Testimonio } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function TestimonioForm({ testimonio, onDone }: { testimonio?: Testimonio; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(upsertTestimonioAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      {testimonio && <input type="hidden" name="id" value={testimonio.id} />}
      <div>
        <label className={labelClass}>Nombre</label>
        <input name="nombre" defaultValue={testimonio?.nombre} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Ubicación</label>
        <input name="ubicacion" defaultValue={testimonio?.ubicacion} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Foto (URL)</label>
        <input name="foto" defaultValue={testimonio?.foto} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Estrellas (1 a 5)</label>
        <input type="number" min={1} max={5} name="estrellas" defaultValue={testimonio?.estrellas ?? 5} className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Comentario</label>
        <textarea name="comentario" defaultValue={testimonio?.comentario} required rows={3} className={inputClass} />
      </div>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          {testimonio ? "Guardar cambios" : "Agregar testimonio"}
        </button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function TestimoniosManager({ testimonios }: { testimonios: Testimonio[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este testimonio?")) return;
    startTransition(() => {
      deleteTestimonioAction(id);
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Agregar testimonio</h2>
        <TestimonioForm />
      </div>

      <div className="space-y-3">
        {testimonios.map((t) => (
          <Fragment key={t.id}>
            <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: t.estrellas }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-brand-gold-500 text-brand-gold-500" />
                  ))}
                </div>
                <p className="mt-1 font-semibold text-brand-black">{t.nombre}</p>
                <p className="text-xs text-brand-black/50">{t.ubicacion}</p>
                <p className="mt-1 max-w-xl text-sm text-brand-black/70">{t.comentario}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={() => setEditando(editando === t.id ? null : t.id)} className="text-brand-green-700 hover:underline">
                  <Pencil className="inline h-4 w-4" /> Editar
                </button>
                <button type="button" disabled={pending} onClick={() => eliminar(t.id)} className="text-red-600 hover:underline disabled:opacity-50">
                  <Trash2 className="inline h-4 w-4" /> Eliminar
                </button>
              </div>
            </div>
            {editando === t.id && (
              <div className="rounded-2xl border border-black/5 bg-brand-cream/60 p-5">
                <TestimonioForm testimonio={t} onDone={() => setEditando(null)} />
              </div>
            )}
          </Fragment>
        ))}
        {testimonios.length === 0 && (
          <p className="rounded-2xl border border-black/5 bg-white py-8 text-center text-sm text-brand-black/50 shadow-sm">
            Todavía no hay testimonios cargados.
          </p>
        )}
      </div>
    </div>
  );
}
