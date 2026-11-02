"use client";

import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { loteCoincide, type LeadConBusqueda, type LoteDisponible } from "@/lib/coincidencias";
import { labelOrigen } from "@/lib/leads";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";

const usd = (v: number | null) => (v === null ? "—" : `USD ${v.toLocaleString("es-AR")}`);
const tienePerfil = (l: LeadConBusqueda) => Boolean(l.presupuestoUsd || l.zona || l.pago);

export default function CoincidenciasManager({ lotes, leads }: { lotes: LoteDisponible[]; leads: LeadConBusqueda[] }) {
  const [vista, setVista] = useState<"lote" | "cliente">("lote");
  const [loteId, setLoteId] = useState(lotes[0]?.id ?? "");
  const conPerfil = useMemo(() => leads.filter(tienePerfil), [leads]);
  const lote = lotes.find((l) => l.id === loteId);

  const interesados = useMemo(() => (lote ? conPerfil.filter((ld) => loteCoincide(lote, ld)) : []), [lote, conPerfil]);
  const porCliente = useMemo(
    () =>
      conPerfil
        .map((ld) => ({ lead: ld, lotes: lotes.filter((lo) => loteCoincide(lo, ld)) }))
        .sort((a, b) => b.lotes.length - a.lotes.length),
    [conPerfil, lotes]
  );

  const proyectos = useMemo(() => [...new Set(lotes.map((l) => l.proyecto))], [lotes]);

  const mensajeLote = (ld: LeadConBusqueda, lo: LoteDisponible) =>
    `Hola ${ld.nombre.split(" ")[0]}! Te escribo de De Nunzio Negocios Inmobiliarios. Tenemos disponible el lote ${lo.numero} de la manzana ${lo.manzana} en ${lo.proyecto}${lo.superficieM2 ? ` (${lo.superficieM2} m²)` : ""}${lo.precioUsd ? `, a ${usd(lo.precioUsd)}` : ""}. Encaja con lo que estabas buscando. ¿Querés que te pase más info o coordinamos una visita?`;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-brand-black">{lotes.length}</p>
          <p className="text-xs text-brand-black/60">Lotes disponibles</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-brand-black">{conPerfil.length}</p>
          <p className="text-xs text-brand-black/60">Clientes activos con "Qué busca" cargado</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-2xl font-bold text-brand-black">{leads.length - conPerfil.length}</p>
          <p className="text-xs text-brand-black/60">Clientes activos sin perfil (completalo en el CRM)</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["lote", "cliente"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setVista(v)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${vista === v ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}
          >
            {v === "lote" ? "Por lote" : "Por cliente"}
          </button>
        ))}
      </div>

      {vista === "lote" && (
        <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
          <label className="block text-sm font-semibold text-brand-black">
            Elegí un lote disponible
            <select value={loteId} onChange={(e) => setLoteId(e.target.value)} className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm font-normal">
              {proyectos.map((p) => (
                <optgroup key={p} label={p}>
                  {lotes
                    .filter((l) => l.proyecto === p)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        Mz {l.manzana} · Lote {l.numero}
                        {l.superficieM2 ? ` · ${l.superficieM2} m²` : ""} · {usd(l.precioUsd)}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
          {lote && (
            <>
              <p className="text-sm text-brand-black/70">
                {interesados.length === 0
                  ? "Ningún cliente activo coincide con este lote todavía."
                  : `${interesados.length} cliente${interesados.length === 1 ? "" : "s"} coincide${interesados.length === 1 ? "" : "n"} con este lote:`}
              </p>
              <ul className="divide-y divide-black/5">
                {interesados.map((ld) => (
                  <li key={ld.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="text-sm">
                      <p className="font-semibold text-brand-black">{ld.nombre}</p>
                      <p className="text-xs text-brand-black/60">
                        {[ld.presupuestoUsd ? `Hasta ${usd(ld.presupuestoUsd)}` : null, ld.zona, ld.pago, ld.anticipo === "si" ? "con anticipo" : null, labelOrigen(ld.origen)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <a
                      href={buildWhatsappClienteUrl(ld.telefono, mensajeLote(ld, lote))}
                      target="_blank"
                      rel="noopener"
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Ofrecer por WhatsApp
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {vista === "cliente" && (
        <div className="space-y-2">
          {porCliente.length === 0 && (
            <p className="rounded-xl bg-white p-4 text-sm text-brand-black/60 shadow-sm">
              Todavía no hay clientes con "Qué busca" cargado. Completalo desde la ficha de cada lead en el CRM (Ver más → Qué busca).
            </p>
          )}
          {porCliente.map(({ lead: ld, lotes: suyos }) => (
            <details key={ld.id} className="rounded-xl bg-white p-3 shadow-sm">
              <summary className="cursor-pointer text-sm">
                <span className="font-semibold text-brand-black">{ld.nombre}</span>{" "}
                <span className="text-brand-black/60">
                  — {suyos.length} lote{suyos.length === 1 ? "" : "s"} le sirve{suyos.length === 1 ? "" : "n"}
                  {ld.presupuestoUsd ? ` · hasta ${usd(ld.presupuestoUsd)}` : ""}
                  {ld.zona ? ` · ${ld.zona}` : ""}
                </span>
              </summary>
              <ul className="mt-2 space-y-1">
                {suyos.slice(0, 15).map((lo) => (
                  <li key={lo.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span>
                      {lo.proyecto} · Mz {lo.manzana} · Lote {lo.numero} · {usd(lo.precioUsd)}
                    </span>
                    <a href={buildWhatsappClienteUrl(ld.telefono, mensajeLote(ld, lo))} target="_blank" rel="noopener" className="font-semibold text-emerald-700 underline">
                      Ofrecer
                    </a>
                  </li>
                ))}
                {suyos.length > 15 && <li className="text-xs text-brand-black/50">…y {suyos.length - 15} más.</li>}
              </ul>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
