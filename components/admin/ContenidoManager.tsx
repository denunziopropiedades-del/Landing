"use client";

import { useActionState } from "react";
import { upsertFinanciacionAction, upsertPromocionAction, upsertTextosAction } from "@/lib/admin/actions";
import type { ConfigFinanciacion, Promocion, SiteTextos } from "@/types/site";

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

function toLocalDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PromocionForm({ promocion }: { promocion: Promocion }) {
  const [state, formAction, pending] = useActionState(upsertPromocionAction, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="activa" id="promo-activa" defaultChecked={promocion.activa} />
        <label htmlFor="promo-activa" className="text-sm text-brand-black/70">
          Promoción activa (muestra el bloque de &quot;últimos días&quot;)
        </label>
      </div>
      <div>
        <label className={labelClass}>Título</label>
        <input name="titulo" defaultValue={promocion.titulo} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Bajada</label>
        <input name="bajada" defaultValue={promocion.bajada} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Fecha y hora de fin</label>
        <input
          type="datetime-local"
          name="fechaFin"
          defaultValue={toLocalDatetime(promocion.fechaFin)}
          required
          className={inputClass}
        />
      </div>
      <div className="flex items-end gap-3">
        <SaveButton pending={pending} />
        {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function FinanciacionForm({ config }: { config: ConfigFinanciacion }) {
  const [state, formAction, pending] = useActionState(upsertFinanciacionAction, null);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className={labelClass}>Anticipo mínimo (%)</label>
        <input type="number" name="anticipoMinimoPct" defaultValue={config.anticipoMinimoPct} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Anticipo máximo (%)</label>
        <input type="number" name="anticipoMaximoPct" defaultValue={config.anticipoMaximoPct} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Cuotas disponibles (separadas por coma)</label>
        <input name="cuotasOpciones" defaultValue={config.cuotasOpciones.join(", ")} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Interés anual (%)</label>
        <input type="number" name="interesAnualPct" defaultValue={config.interesAnualPct} required className={inputClass} />
      </div>
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
        <label className={labelClass}>Título del hero</label>
        <input name="heroTitulo" defaultValue={textos.heroTitulo} required className={inputClass} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Subtítulo del hero</label>
        <textarea name="heroSubtitulo" defaultValue={textos.heroSubtitulo} required rows={2} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Número de WhatsApp (sin espacios, con código de país)</label>
        <input name="whatsappNumero" defaultValue={textos.whatsappNumero} required className={inputClass} />
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
  promocion,
  financiacion,
  textos,
}: {
  promocion: Promocion;
  financiacion: ConfigFinanciacion;
  textos: SiteTextos;
}) {
  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Promoción / contador regresivo</h2>
        <PromocionForm promocion={promocion} />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Financiación</h2>
        <FinanciacionForm config={financiacion} />
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Textos y datos de contacto</h2>
        <TextosForm textos={textos} />
      </div>
    </div>
  );
}
