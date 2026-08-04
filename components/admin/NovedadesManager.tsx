"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteNovedadAction, upsertNovedadAction } from "@/lib/admin/actions";
import type { Novedad } from "@/lib/content";
import type { Proyecto } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function NovedadForm({
  proyectos,
  novedad,
  onDone,
}: {
  proyectos: Proyecto[];
  novedad?: Novedad;
  onDone?: () => void;
}) {
  const [state, formAction, pending] = useActionState(upsertNovedadAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3"
    >
      {novedad && <input type="hidden" name="id" value={novedad.id} />}
      <div>
        <label className={labelClass}>Título</label>
        <input name="titulo" defaultValue={novedad?.titulo} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Proyecto</label>
        <select name="proyectoId" defaultValue={novedad?.proyectoId ?? ""} className={inputClass}>
          <option value="">Global (todos los proyectos)</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Contenido</label>
        <textarea name="contenido" defaultValue={novedad?.contenido} required rows={3} className={inputClass} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="publicado" id={`pub-${novedad?.id ?? "new"}`} defaultChecked={novedad?.publicado ?? true} />
        <label htmlFor={`pub-${novedad?.id ?? "new"}`} className="text-sm text-brand-black/70">
          Publicada (visible en la web)
        </label>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          {novedad ? "Guardar cambios" : "Publicar novedad"}
        </button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function NovedadesManager({ proyectos, novedades }: { proyectos: Proyecto[]; novedades: Novedad[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta novedad?")) return;
    startTransition(() => {
      deleteNovedadAction(id);
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Nueva novedad</h2>
        <NovedadForm proyectos={proyectos} />
      </div>

      <div className="space-y-3">
        {novedades.map((n) => (
          <Fragment key={n.id}>
            <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div>
                <p className="font-semibold text-brand-black">
                  {n.titulo}{" "}
                  {!n.publicado && (
                    <span className="ml-2 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium uppercase text-brand-black/50">
                      Borrador
                    </span>
                  )}
                </p>
                <p className="mt-1 max-w-xl text-sm text-brand-black/70">{n.contenido}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={() => setEditando(editando === n.id ? null : n.id)} className="text-brand-green-700 hover:underline">
                  <Pencil className="inline h-4 w-4" /> Editar
                </button>
                <button type="button" disabled={pending} onClick={() => eliminar(n.id)} className="text-red-600 hover:underline disabled:opacity-50">
                  <Trash2 className="inline h-4 w-4" /> Eliminar
                </button>
              </div>
            </div>
            {editando === n.id && (
              <div className="rounded-2xl border border-black/5 bg-brand-cream/60 p-5">
                <NovedadForm proyectos={proyectos} novedad={n} onDone={() => setEditando(null)} />
              </div>
            )}
          </Fragment>
        ))}
        {novedades.length === 0 && (
          <p className="rounded-2xl border border-black/5 bg-white py-8 text-center text-sm text-brand-black/50 shadow-sm">
            Todavía no publicaste ninguna novedad.
          </p>
        )}
      </div>
    </div>
  );
}
