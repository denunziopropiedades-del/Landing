"use client";

import { useState, useTransition } from "react";
import { actualizarBusquedaLeadAction } from "@/lib/admin/actions";
import { ORIGENES, labelOrigen } from "@/lib/leads";
import type { BusquedaLead, Lead } from "@/types/site";

/** Etiquetas chicas para la tarjeta: de dónde vino y cuántas veces consultó. */
export function EtiquetasOrigen({ lead }: { lead: Lead }) {
  const veces = (lead.consultasUnificadas ?? 0) + 1;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {lead.origen && (
        <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-semibold text-sky-800" title={lead.utmCampaign ?? undefined}>
          {labelOrigen(lead.origen)}
        </span>
      )}
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          veces > 1 ? "bg-amber-100 text-amber-800" : "bg-black/5 text-brand-black/60"
        }`}
      >
        {veces > 1 ? `🔁 Consultó ${veces} veces` : "Consultó 1 vez"}
      </span>
    </div>
  );
}

/** Qué busca el cliente: presupuesto, zona, forma de pago y anticipo. */
export default function PerfilBusquedaLead({
  lead,
  onActualizado,
}: {
  lead: Lead;
  onActualizado: (id: string, cambios: Partial<Lead>) => void;
}) {
  const b = lead.busqueda;
  const [presupuesto, setPresupuesto] = useState(b?.presupuestoUsd?.toString() ?? "");
  const [zona, setZona] = useState(b?.zona ?? "");
  const [pago, setPago] = useState<string>(b?.pago ?? "");
  const [anticipo, setAnticipo] = useState<string>(b?.anticipo ?? "");
  const [notas, setNotas] = useState(b?.notas ?? "");
  const [origen, setOrigen] = useState(lead.origen ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const guardar = () =>
    startTransition(async () => {
      setError(null);
      setOk(false);
      const r = await actualizarBusquedaLeadAction(lead.id, { presupuestoUsd: presupuesto, zona, pago, anticipo, notas, origen });
      if (!r.ok) return setError(r.error);
      const busqueda: BusquedaLead = {
        presupuestoUsd: presupuesto ? Number(presupuesto.replace(/[^\d.]/g, "")) : null,
        zona: zona || null,
        pago: (pago || null) as BusquedaLead["pago"],
        anticipo: (anticipo || null) as BusquedaLead["anticipo"],
        notas: notas || null,
      };
      onActualizado(lead.id, { busqueda, origen: origen || null });
      setOk(true);
    });

  const campo = "w-full rounded-lg border border-black/10 px-2 py-1 text-xs focus:border-brand-green-600 focus:outline-none";

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-2">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-sky-900">Qué busca</p>
      <div className="grid grid-cols-2 gap-1.5">
        <label className="text-[10px] text-brand-black/60">
          Presupuesto (USD)
          <input value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} inputMode="numeric" placeholder="Ej: 15000" className={campo} />
        </label>
        <label className="text-[10px] text-brand-black/60">
          Zona
          <input value={zona} onChange={(e) => setZona(e.target.value)} placeholder="Ej: Guernica" className={campo} />
        </label>
        <label className="text-[10px] text-brand-black/60">
          Forma de pago
          <select value={pago} onChange={(e) => setPago(e.target.value)} className={campo}>
            <option value="">Sin dato</option>
            <option value="contado">Contado</option>
            <option value="cuotas">Cuotas</option>
            <option value="ambas">Cualquiera</option>
          </select>
        </label>
        <label className="text-[10px] text-brand-black/60">
          ¿Tiene anticipo?
          <select value={anticipo} onChange={(e) => setAnticipo(e.target.value)} className={campo}>
            <option value="">Sin dato</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </label>
        <label className="col-span-2 text-[10px] text-brand-black/60">
          Notas (medidas, esquina, plazos…)
          <input value={notas} onChange={(e) => setNotas(e.target.value)} className={campo} />
        </label>
        <label className="col-span-2 text-[10px] text-brand-black/60">
          ¿Cómo nos conoció?
          <select value={origen} onChange={(e) => setOrigen(e.target.value)} className={campo}>
            <option value="">Sin dato</option>
            {ORIGENES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
            {origen && !ORIGENES.some((o) => o.value === origen) && <option value={origen}>{origen}</option>}
          </select>
        </label>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <button
          type="button"
          onClick={guardar}
          disabled={pendiente}
          className="rounded-lg bg-sky-700 px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
        >
          {pendiente ? "Guardando…" : "Guardar"}
        </button>
        {ok && <span className="text-[11px] text-emerald-700">Guardado</span>}
        {error && <span className="text-[11px] text-red-600">{error}</span>}
      </div>
    </div>
  );
}
