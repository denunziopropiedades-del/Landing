"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { desmarcarCuotaPagadaAction, marcarCuotaPagadaAction } from "@/lib/admin/actions";
import { formatUsd } from "@/lib/utils";
import type { Cuota } from "@/types/site";

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function mesActual() {
  return hoyIso().slice(0, 7);
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function FilaCuota({ cuota }: { cuota: Cuota }) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(cuota.montoUsd.toString());
  const [fecha, setFecha] = useState(hoyIso());
  const [, startTransition] = useTransition();

  const confirmarPago = () => {
    startTransition(() => {
      marcarCuotaPagadaAction(cuota.id, monto, fecha).then((res) => {
        if (!res.ok) alert(`No se pudo marcar la cuota como pagada: ${res.error}`);
        else setEditando(false);
      });
    });
  };

  const deshacer = () => {
    if (!confirm(`¿Deshacer el pago de la cuota ${cuota.numero}?`)) return;
    startTransition(() => {
      desmarcarCuotaPagadaAction(cuota.id).then((res) => {
        if (!res.ok) alert(`No se pudo deshacer el pago: ${res.error}`);
      });
    });
  };

  return (
    <tr className="border-b border-black/5 last:border-0">
      <td className="px-3 py-2 text-brand-black/70">{cuota.numero}</td>
      <td className="px-3 py-2 text-brand-black/70">{formatearFecha(cuota.vencimiento)}</td>
      <td className="px-3 py-2 text-right text-brand-black/70">{formatUsd(cuota.montoUsd)}</td>
      <td className="px-3 py-2">
        {cuota.pagada ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="rounded-full bg-brand-green-700/10 px-2.5 py-0.5 text-xs font-medium text-brand-green-700">
              Pagada {cuota.pagadoEn ? `— ${formatearFecha(cuota.pagadoEn.slice(0, 10))}` : ""}
            </span>
            <button type="button" onClick={deshacer} className="text-xs text-brand-black/40 underline hover:text-brand-black/60">
              Deshacer
            </button>
          </span>
        ) : cuota.diasMora > 0 ? (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            {cuota.diasMora} día{cuota.diasMora === 1 ? "" : "s"} de mora
          </span>
        ) : (
          <span className="rounded-full bg-black/5 px-2.5 py-0.5 text-xs font-medium text-brand-black/50">Pendiente</span>
        )}
      </td>
      <td className="px-3 py-2 text-right">
        {!cuota.pagada &&
          (editando ? (
            <span className="inline-flex items-center gap-1.5">
              <input
                type="number"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="w-20 rounded-lg border border-black/10 px-1.5 py-1 text-xs"
              />
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                className="rounded-lg border border-black/10 px-1.5 py-1 text-xs"
              />
              <button
                type="button"
                onClick={confirmarPago}
                className="rounded-full bg-brand-green-700 px-2.5 py-1 text-xs font-semibold text-white"
              >
                Confirmar
              </button>
              <button type="button" onClick={() => setEditando(false)} className="text-xs text-brand-black/40">
                Cancelar
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="rounded-full border border-brand-green-600/40 px-3 py-1 text-xs font-medium text-brand-green-700 hover:bg-brand-green-700/5"
            >
              Marcar pagada
            </button>
          ))}
      </td>
    </tr>
  );
}

function TarjetaCliente({ cuotas }: { cuotas: Cuota[] }) {
  const [abierto, setAbierto] = useState(false);
  const lead = cuotas[0].lead;
  const pagadas = cuotas.filter((c) => c.pagada).length;
  const enMora = cuotas.filter((c) => c.diasMora > 0).length;
  const proximaPendiente = cuotas.find((c) => !c.pagada);
  const nombreCompleto = `${lead.nombre} ${lead.apellido ?? ""}`.trim();
  const loteTexto = lead.lotes.map((l) => `Lote ${l.numero}`).join(", ");

  return (
    <div className="rounded-2xl border border-black/5 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-brand-black">{nombreCompleto}</p>
          <p className="text-xs text-brand-black/50">
            {lead.proyectoNombre}
            {lead.manzana ? ` — Manzana ${lead.manzana}` : ""}
            {loteTexto ? ` — ${loteTexto}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-xs text-brand-black/50">
              {pagadas}/{cuotas.length} pagadas
              {proximaPendiente ? ` · próx. vence ${formatearFecha(proximaPendiente.vencimiento)}` : ""}
            </p>
            {enMora > 0 && (
              <p className="text-xs font-semibold text-red-600">
                {enMora} cuota{enMora === 1 ? "" : "s"} en mora
              </p>
            )}
          </div>
          {abierto ? <ChevronUp className="h-4 w-4 text-brand-black/40" /> : <ChevronDown className="h-4 w-4 text-brand-black/40" />}
        </div>
      </button>

      {abierto && (
        <div className="overflow-x-auto border-t border-black/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-medium uppercase tracking-wide text-brand-black/40">
                <th className="px-3 py-2">Cuota</th>
                <th className="px-3 py-2">Vencimiento</th>
                <th className="px-3 py-2 text-right">Monto</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {cuotas.map((c) => (
                <FilaCuota key={c.id} cuota={c} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CobranzasManager({ cuotas }: { cuotas: Cuota[] }) {
  const [soloMora, setSoloMora] = useState(false);

  const resumen = useMemo(() => {
    const totalFinanciado = cuotas.reduce((acc, c) => acc + c.montoUsd, 0);
    const totalCobrado = cuotas
      .filter((c) => c.pagada)
      .reduce((acc, c) => acc + (c.montoPagadoUsd ?? c.montoUsd), 0);
    const enMora = cuotas.filter((c) => c.diasMora > 0);
    const mes = mesActual();
    const vencenEsteMes = cuotas.filter((c) => c.vencimiento.slice(0, 7) === mes);
    const cobradasEsteMes = cuotas.filter((c) => c.pagada && c.pagadoEn && c.pagadoEn.slice(0, 7) === mes);
    return {
      totalFinanciado,
      totalCobrado,
      totalPendiente: totalFinanciado - totalCobrado,
      enMoraCantidad: enMora.length,
      vencenEsteMes: vencenEsteMes.length,
      cobradasEsteMes: cobradasEsteMes.length,
    };
  }, [cuotas]);

  const clientes = useMemo(() => {
    const porLead = new Map<string, Cuota[]>();
    for (const c of cuotas) {
      if (soloMora && c.diasMora === 0) continue;
      const arr = porLead.get(c.leadId) ?? [];
      arr.push(c);
      porLead.set(c.leadId, arr);
    }
    return Array.from(porLead.entries())
      .map(([leadId, cs]) => ({ leadId, cuotas: cs.sort((a, b) => a.numero - b.numero) }))
      .sort((a, b) => (a.cuotas[0]?.vencimiento ?? "").localeCompare(b.cuotas[0]?.vencimiento ?? ""));
  }, [cuotas, soloMora]);

  const tarjetas = [
    { label: "Total financiado", valor: resumen.totalFinanciado },
    { label: "Total cobrado", valor: resumen.totalCobrado, destacado: true },
    { label: "Total pendiente", valor: resumen.totalPendiente },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tarjetas.map((t) => (
          <div key={t.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-brand-black/50">{t.label}</p>
            <p className={`mt-1 font-display text-lg font-bold ${t.destacado ? "text-brand-green-700" : "text-brand-black"}`}>
              {formatUsd(t.valor)}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-xs text-brand-black/50">Cuotas en mora</p>
          <p className={`mt-1 font-display text-lg font-bold ${resumen.enMoraCantidad > 0 ? "text-red-600" : "text-brand-black"}`}>
            {resumen.enMoraCantidad}
          </p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-xs text-brand-black/50">Ciclo de este mes</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">
            {resumen.cobradasEsteMes}/{resumen.vencenEsteMes}
          </p>
          <p className="text-[11px] text-brand-black/40">cobradas / vencen</p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-brand-black/70">
        <input
          type="checkbox"
          checked={soloMora}
          onChange={(e) => setSoloMora(e.target.checked)}
          className="h-4 w-4 accent-brand-green-700"
        />
        Mostrar solo clientes con cuotas en mora
      </label>

      <div className="space-y-3">
        {clientes.length === 0 && (
          <p className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-brand-black/50 shadow-sm">
            {soloMora ? "No hay clientes con cuotas en mora." : "Todavía no hay clientes financiados con cuotas generadas."}
          </p>
        )}
        {clientes.map(({ leadId, cuotas: cs }) => (
          <TarjetaCliente key={leadId} cuotas={cs} />
        ))}
      </div>
    </div>
  );
}
