"use client";

import { useState, useTransition } from "react";
import { actualizarBusquedaLeadAction, bloquearAgendaLeadAction, cancelarVisitaAction, reenviarMailVisitaAction } from "@/lib/admin/actions";
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
          veces >= 3 ? "bg-red-100 text-red-800" : veces === 2 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
        }`}
      >
        {veces > 1 ? `🔁 Consultó ${veces} veces` : "Consultó 1 vez"}
      </span>
      {(lead.visitasAgendadas ?? 0) > 0 && (
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            (lead.visitasAgendadas ?? 0) >= 3 ? "bg-red-100 text-red-800" : (lead.visitasAgendadas ?? 0) === 2 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          📅 Agendó {lead.visitasAgendadas} {lead.visitasAgendadas === 1 ? "visita" : "visitas"}
        </span>
      )}
      {!lead.proximaVisita && lead.ultimaVisita && (
        <span className="rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-brand-black/60">
          Última visita {lead.ultimaVisita.slice(8, 10)}/{lead.ultimaVisita.slice(5, 7)}
        </span>
      )}
      {lead.agendaBloqueada && (
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">🚫 Agenda bloqueada</span>
      )}
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

/** Botón para que esta persona no pueda agendar más visitas desde la web (queda atado a su mail y teléfono). */
export function BotonBloquearAgenda({
  lead,
  onActualizado,
}: {
  lead: Lead;
  onActualizado: (id: string, cambios: Partial<Lead>) => void;
}) {
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const bloqueada = !!lead.agendaBloqueada;
  const toggle = () => {
    if (
      !bloqueada &&
      !confirm(
        `¿Bloquear a ${lead.nombre} para que no pueda agendar más visitas desde la web?\n\nQueda atado a su mail${lead.email ? ` (${lead.email})` : ""} y a su teléfono. Lo podés desbloquear cuando quieras.`
      )
    )
      return;
    startTransition(async () => {
      setError(null);
      const r = await bloquearAgendaLeadAction(lead.id, !bloqueada);
      if (!r.ok) return setError(r.error);
      onActualizado(lead.id, { agendaBloqueada: !bloqueada });
    });
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pendiente}
        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold disabled:opacity-50 ${
          bloqueada ? "border border-black/15 text-brand-black/70" : "bg-red-600 text-white"
        }`}
      >
        {pendiente ? "Guardando…" : bloqueada ? "Desbloquear agenda" : "🚫 Bloquear agenda de visitas"}
      </button>
      {error && <span className="text-[11px] text-red-600">{error}</span>}
    </div>
  );
}

const fechaCortaVisita = (iso: string) => {
  const d = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("es-AR", { weekday: "short", day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(d);
};

/** Visitas pendientes o confirmadas del cliente, con botón para cancelarlas (saca del calendario y le avisa por mail). */
export function VisitasLead({
  lead,
  onActualizado,
}: {
  lead: Lead;
  onActualizado: (id: string, cambios: Partial<Lead>) => void;
}) {
  const [pendiente, startTransition] = useTransition();
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
  const visitas = lead.visitasActivas ?? [];
  if (!visitas.length && !aviso) return null;

  const cancelar = (v: NonNullable<Lead["visitasActivas"]>[number]) => {
    const motivo = window.prompt(
      `¿Cancelar la visita de ${lead.nombre} del ${fechaCortaVisita(v.fecha)} a las ${v.horario}?\n\nSe saca del calendario, se libera el horario y se le avisa por mail${lead.email ? ` (${lead.email})` : ""}.\n\nMotivo para el cliente (opcional):`,
      ""
    );
    if (motivo === null) return;
    startTransition(async () => {
      const r = await cancelarVisitaAction(v.id, motivo);
      if (!r.ok) return setAviso({ ok: false, texto: r.error });
      setAviso({ ok: true, texto: r.aviso ?? "Visita cancelada." });
      onActualizado(lead.id, { visitasActivas: visitas.filter((x) => x.id !== v.id) });
    });
  };

  return (
    <div className="mt-1.5 space-y-1">
      {visitas.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1">
          <span className="text-[11px] text-amber-900">
            📅 <b className="capitalize">{fechaCortaVisita(v.fecha)}</b> {v.horario} hs · {v.estado}
          </span>
          <button
            type="button"
            disabled={pendiente}
            title="Reenviar al cliente el mail de la visita con la ubicación"
            onClick={(e) => {
              e.stopPropagation();
              startTransition(async () => {
                const r = await reenviarMailVisitaAction(v.id);
                setAviso(r.ok ? { ok: true, texto: r.aviso ?? "Mail reenviado." } : { ok: false, texto: r.error });
              });
            }}
            className="shrink-0 rounded-md border border-emerald-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            📧 Ubicación
          </button>
          <button
            type="button"
            disabled={pendiente}
            onClick={(e) => {
              e.stopPropagation();
              cancelar(v);
            }}
            className="shrink-0 rounded-md border border-red-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {pendiente ? "Cancelando…" : "Cancelar visita"}
          </button>
        </div>
      ))}
      {aviso && <p className={`text-[11px] ${aviso.ok ? "text-emerald-700" : "text-red-600"}`}>{aviso.texto}</p>}
    </div>
  );
}
