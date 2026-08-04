"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { eliminarFaqAction, upsertFaqAction } from "@/lib/admin/actions";
import type { FaqItem, Proyecto } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function FaqForm({ proyectos, faq, onDone }: { proyectos: Proyecto[]; faq?: FaqItem; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(upsertFaqAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3"
    >
      {faq && <input type="hidden" name="id" value={faq.id} />}
      <div>
        <label className={labelClass}>Pregunta</label>
        <input name="pregunta" defaultValue={faq?.pregunta} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Respuesta</label>
        <textarea name="respuesta" defaultValue={faq?.respuesta} required rows={3} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Proyecto</label>
        <select name="proyectoId" defaultValue={faq?.proyectoId ?? ""} className={inputClass}>
          <option value="">Global (todos los proyectos)</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          {faq ? "Guardar cambios" : "Agregar pregunta"}
        </button>
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function FaqsManager({ proyectos, faqs }: { proyectos: Proyecto[]; faqs: FaqItem[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta pregunta frecuente?")) return;
    startTransition(() => {
      eliminarFaqAction(id);
    });
  };

  const nombreProyecto = (id: string | null) => proyectos.find((p) => p.id === id)?.nombre ?? "Global";

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Nueva pregunta frecuente</h2>
        <FaqForm proyectos={proyectos} />
      </div>

      <div className="space-y-3">
        {faqs.map((f) => (
          <Fragment key={f.id}>
            <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div>
                <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-medium text-brand-black/50">
                  {nombreProyecto(f.proyectoId)}
                </span>
                <p className="mt-1 font-semibold text-brand-black">{f.pregunta}</p>
                <p className="mt-1 max-w-xl text-sm text-brand-black/70">{f.respuesta}</p>
              </div>
              <div className="flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={() => setEditando(editando === f.id ? null : f.id)} className="text-brand-green-700 hover:underline">
                  <Pencil className="inline h-4 w-4" /> Editar
                </button>
                <button type="button" disabled={pending} onClick={() => eliminar(f.id)} className="text-red-600 hover:underline disabled:opacity-50">
                  <Trash2 className="inline h-4 w-4" /> Eliminar
                </button>
              </div>
            </div>
            {editando === f.id && (
              <div className="rounded-2xl border border-black/5 bg-brand-cream/60 p-5">
                <FaqForm proyectos={proyectos} faq={f} onDone={() => setEditando(null)} />
              </div>
            )}
          </Fragment>
        ))}
        {faqs.length === 0 && (
          <p className="rounded-2xl border border-black/5 bg-white py-8 text-center text-sm text-brand-black/50 shadow-sm">
            Todavía no hay preguntas frecuentes cargadas.
          </p>
        )}
      </div>
    </div>
  );
}
