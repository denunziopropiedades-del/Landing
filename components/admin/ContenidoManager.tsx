"use client";

import { useActionState } from "react";
import { upsertFinanciacionAction, upsertTextosAction } from "@/lib/admin/actions";
import type { ConfigFinanciacion, SiteTextos } from "@/types/site";

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function SaveButton({ pending, label }: { pending: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
    >
      {pending ? "Guardando..." : (label ?? "Guardar cambios")}
    </button>
  );
}

function FinanciacionForm({ proyectoId, config }: { proyectoId: string; config: ConfigFinanciacion }) {
  const [state, formAction, pending] = useActionState(upsertFinanciacionAction, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <p className="text-xs text-brand-black/50 sm:col-span-2">
        Opcional: esta calculadora por porcentaje es un cálculo aproximado. Si ya cargaste un plan fijo de
        anticipo/cuotas por medida de lote (en Lotes y precios), ese plan fijo tiene prioridad y no hace falta
        completar esto.
      </p>
      <input type="hidden" name="proyectoId" value={proyectoId} />
      <div>
        <label className={labelClass}>Anticipo mínimo (%)</label>
        <input type="number" name="anticipoMinimoPct" defaultValue={config.anticipoMinimoPct} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Anticipo máximo (%)</label>
        <input type="number" name="anticipoMaximoPct" defaultValue={config.anticipoMaximoPct} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Cuotas disponibles (separadas por coma)</label>
        <input name="cuotasOpciones" defaultValue={config.cuotasOpciones.join(", ")} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Interés anual (%)</label>
        <input type="number" name="interesAnualPct" defaultValue={config.interesAnualPct} className={inputClass} />
      </div>

      <div className="sm:col-span-2 mt-2 border-t border-black/10 pt-4">
        <p className="text-sm font-semibold text-brand-black">Planes de financiación a monto fijo (USD)</p>
        <p className="mt-1 text-xs text-brand-black/50">
          Opcional: hasta 3 planes fijos, independientes de la calculadora de arriba. Por ejemplo &ldquo;anticipo USD
          500, en 6 cuotas de USD 400 c/u&rdquo;. Dejá una fila vacía si no la vas a usar.
        </p>
      </div>
      {[1, 2, 3].map((i) => {
        const plan = config.planesFijos[i - 1];
        return (
          <div key={i} className="sm:col-span-2 grid gap-3 rounded-lg border border-black/10 p-3 sm:grid-cols-3">
            <div>
              <label className={labelClass}>Anticipo (USD)</label>
              <input
                type="number"
                name={`anticipoUsd${i}`}
                defaultValue={plan?.anticipoUsd ?? ""}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Cantidad de cuotas</label>
              <input type="number" name={`cuotasPlan${i}`} defaultValue={plan?.cuotas ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Valor de cada cuota (USD)</label>
              <input
                type="number"
                name={`valorCuotaUsd${i}`}
                defaultValue={plan?.valorCuotaUsd ?? ""}
                className={inputClass}
              />
            </div>
          </div>
        );
      })}

      <div className="flex items-end gap-3">
        <SaveButton pending={pending} />
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function TextosForm({ textos }: { textos: SiteTextos }) {
  const [state, formAction, pending] = useActionState(upsertTextosAction, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className={labelClass}>Título del hero (home general)</label>
        <input name="heroTitulo" defaultValue={textos.heroTitulo} required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Subtítulo del hero</label>
        <textarea name="heroSubtitulo" defaultValue={textos.heroSubtitulo} required rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Número de WhatsApp general (sin espacios, con código de país)</label>
        <input name="whatsappNumero" defaultValue={textos.whatsappNumero} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Teléfono de oficina (visible en la web)</label>
        <input name="telefonoOficina" defaultValue={textos.telefonoOficina} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email de contacto</label>
        <input type="email" name="email" defaultValue={textos.email} required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Mensaje por defecto de WhatsApp</label>
        <textarea name="whatsappMensajeDefault" defaultValue={textos.whatsappMensajeDefault} required rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Instagram</label>
        <input name="instagram" defaultValue={textos.instagram} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Facebook</label>
        <input name="facebook" defaultValue={textos.facebook} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>YouTube</label>
        <input name="youtube" defaultValue={textos.youtube} className={inputClass} />
      </div>
      <div className="flex items-end gap-3">
        <SaveButton pending={pending} />
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function ContenidoManager({
  proyectoId,
  financiacion,
  textos,
}: {
  proyectoId: string;
  financiacion: ConfigFinanciacion;
  textos: SiteTextos;
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Financiación del proyecto</h2>
        <FinanciacionForm proyectoId={proyectoId} config={financiacion} />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Textos generales de la plataforma</h2>
        <TextosForm textos={textos} />
      </div>
    </div>
  );
}
