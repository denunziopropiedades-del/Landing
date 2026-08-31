"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { desmarcarCuotaPagadaAction, marcarCuotaPagadaAction } from "@/lib/admin/actions";
import { formatArs, formatUsd } from "@/lib/utils";
import type { ClienteCobranzas, Cuota, MedioPago } from "@/types/site";

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

function mesActual() {
  return hoyIso().slice(0, 7);
}

function formatearFecha(fecha: string) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const LABEL_MEDIO_PAGO: Record<MedioPago, string> = {
  transferencia: "Transferencia",
  efectivo: "Efectivo",
};

function FilaCuota({ cuota }: { cuota: Cuota }) {
  const [editando, setEditando] = useState(false);
  const [monto, setMonto] = useState(cuota.montoUsd.toString());
  const [fecha, setFecha] = useState(hoyIso());
  const [medioPago, setMedioPago] = useState<MedioPago | "">(cuota.medioPago ?? "");
  const [, startTransition] = useTransition();

  const confirmarPago = () => {
    startTransition(() => {
      marcarCuotaPagadaAction(cuota.id, monto, fecha, medioPago).then((res) => {
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
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-brand-green-700/10 px-2.5 py-0.5 text-xs font-medium text-brand-green-700">
              Pagada {cuota.pagadoEn ? `— ${formatearFecha(cuota.pagadoEn.slice(0, 10))}` : ""}
              {cuota.medioPago ? ` (${LABEL_MEDIO_PAGO[cuota.medioPago]})` : ""}
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
            <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
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
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value as MedioPago | "")}
                className="rounded-lg border border-black/10 px-1.5 py-1 text-xs"
              >
                <option value="">Medio de pago</option>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
              </select>
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

function TarjetaCliente({ cliente }: { cliente: ClienteCobranzas }) {
  const [abierto, setAbierto] = useState(false);
  const { cuotas } = cliente;
  const pagadas = cuotas.filter((c) => c.pagada).length;
  const enMora = cuotas.filter((c) => c.diasMora > 0).length;
  const proximaPendiente = cuotas.find((c) => !c.pagada);
  const nombreCompleto = `${cliente.nombre} ${cliente.apellido ?? ""}`.trim();
  const loteTexto = cliente.lotes.map((l) => `Lote ${l.numero}`).join(", ");
  const totalCobradoUsd = cuotas.filter((c) => c.pagada).reduce((acc, c) => acc + (c.montoPagadoUsd ?? c.montoUsd), 0);

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
            {cliente.proyectoNombre}
            {cliente.manzana ? ` — Manzana ${cliente.manzana}` : ""}
            {loteTexto ? ` — ${loteTexto}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3 text-right">
          <div>
            {cuotas.length > 0 ? (
              <p className="text-xs text-brand-black/50">
                {pagadas}/{cuotas.length} cuotas pagadas
                {proximaPendiente ? ` · próx. vence ${formatearFecha(proximaPendiente.vencimiento)}` : ""}
              </p>
            ) : (
              <p className="text-xs font-medium text-amber-600">Seña abonada — faltan generar las cuotas</p>
            )}
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
        <div className="border-t border-black/5">
          <div className="grid gap-3 p-4 text-xs sm:grid-cols-2">
            <div>
              <p className="font-medium text-brand-black/50">Contacto</p>
              <p className="mt-0.5 text-brand-black/80">{cliente.email}</p>
              <p className="text-brand-black/80">{cliente.telefono}</p>
            </div>
            <div>
              <p className="font-medium text-brand-black/50">Plan elegido</p>
              {cliente.planFinanciacion ? (
                <p className="mt-0.5 text-brand-black/80">
                  Anticipo {formatUsd(cliente.planFinanciacion.anticipoUsd)} + {cliente.planFinanciacion.cuotas} cuotas de{" "}
                  {formatUsd(cliente.planFinanciacion.valorCuotaUsd)}
                </p>
              ) : (
                <p className="mt-0.5 text-brand-black/40">Sin plan cargado</p>
              )}
            </div>
            <div>
              <p className="font-medium text-brand-black/50">Seña abonada</p>
              {cliente.senaImporteArs ? (
                <p className="mt-0.5 text-brand-black/80">
                  {formatArs(cliente.senaImporteArs)}
                  {cliente.senaMedioPago ? ` — ${LABEL_MEDIO_PAGO[cliente.senaMedioPago]}` : ""}
                  {cliente.senaNumeroTransaccion ? ` (Nº ${cliente.senaNumeroTransaccion})` : ""}
                </p>
              ) : (
                <p className="mt-0.5 text-brand-black/40">Sin monto cargado todavía</p>
              )}
            </div>
            <div>
              <p className="font-medium text-brand-black/50">Cobrado en cuotas</p>
              <p className="mt-0.5 text-brand-black/80">
                {formatUsd(totalCobradoUsd)} de {formatUsd(cuotas.reduce((acc, c) => acc + c.montoUsd, 0))}
              </p>
            </div>
          </div>

          {cuotas.length > 0 ? (
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
          ) : (
            <p className="border-t border-black/5 p-4 text-xs text-brand-black/60">
              Todavía no se pactó la fecha de la primera cuota. Cargala desde la tarjeta de este lead en el{" "}
              <a href="/admin/crm" className="font-medium text-brand-green-700 underline">
                CRM
              </a>{" "}
              para que se generen automáticamente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function CobranzasManager({ clientes }: { clientes: ClienteCobranzas[] }) {
  const [soloMora, setSoloMora] = useState(false);
  const [soloPendientesDeCuotas, setSoloPendientesDeCuotas] = useState(false);

  const cuotasTodas = useMemo(() => clientes.flatMap((c) => c.cuotas), [clientes]);

  const resumen = useMemo(() => {
    const totalFinanciado = cuotasTodas.reduce((acc, c) => acc + c.montoUsd, 0);
    const totalCobrado = cuotasTodas.filter((c) => c.pagada).reduce((acc, c) => acc + (c.montoPagadoUsd ?? c.montoUsd), 0);
    const enMora = cuotasTodas.filter((c) => c.diasMora > 0);
    const mes = mesActual();
    const vencenEsteMes = cuotasTodas.filter((c) => c.vencimiento.slice(0, 7) === mes);
    const cobradasEsteMes = cuotasTodas.filter((c) => c.pagada && c.pagadoEn && c.pagadoEn.slice(0, 7) === mes);
    const totalSenasArs = clientes.reduce((acc, c) => acc + (c.senaImporteArs ?? 0), 0);
    return {
      totalFinanciado,
      totalCobrado,
      totalPendiente: totalFinanciado - totalCobrado,
      enMoraCantidad: enMora.length,
      vencenEsteMes: vencenEsteMes.length,
      cobradasEsteMes: cobradasEsteMes.length,
      totalSenasArs,
      sinCuotasGeneradas: clientes.filter((c) => c.cuotas.length === 0).length,
    };
  }, [cuotasTodas, clientes]);

  const clientesFiltrados = useMemo(() => {
    return clientes
      .filter((c) => !soloMora || c.cuotas.some((cu) => cu.diasMora > 0))
      .filter((c) => !soloPendientesDeCuotas || c.cuotas.length === 0)
      .slice()
      .sort((a, b) => (a.cuotas[0]?.vencimiento ?? "9999-99").localeCompare(b.cuotas[0]?.vencimiento ?? "9999-99"));
  }, [clientes, soloMora, soloPendientesDeCuotas]);

  const tarjetas = [
    { label: "Total financiado", valor: resumen.totalFinanciado },
    { label: "Total cobrado", valor: resumen.totalCobrado, destacado: true },
    { label: "Total pendiente", valor: resumen.totalPendiente },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tarjetas.map((t) => (
          <div key={t.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs text-brand-black/50">{t.label}</p>
            <p className={`mt-1 font-display text-lg font-bold ${t.destacado ? "text-brand-green-700" : "text-brand-black"}`}>
              {formatUsd(t.valor)}
            </p>
          </div>
        ))}
        <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
          <p className="text-xs text-brand-black/50">Señas abonadas</p>
          <p className="mt-1 font-display text-lg font-bold text-brand-black">{formatArs(resumen.totalSenasArs)}</p>
        </div>
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

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-brand-black/70">
          <input
            type="checkbox"
            checked={soloMora}
            onChange={(e) => setSoloMora(e.target.checked)}
            className="h-4 w-4 accent-brand-green-700"
          />
          Mostrar solo clientes con cuotas en mora
        </label>
        <label className="flex items-center gap-2 text-sm text-brand-black/70">
          <input
            type="checkbox"
            checked={soloPendientesDeCuotas}
            onChange={(e) => setSoloPendientesDeCuotas(e.target.checked)}
            className="h-4 w-4 accent-brand-green-700"
          />
          Mostrar solo señas sin cuotas generadas
          {resumen.sinCuotasGeneradas > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
              {resumen.sinCuotasGeneradas}
            </span>
          )}
        </label>
      </div>

      <div className="space-y-3">
        {clientesFiltrados.length === 0 && (
          <p className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-brand-black/50 shadow-sm">
            {soloMora || soloPendientesDeCuotas
              ? "No hay clientes que cumplan ese filtro."
              : "Todavía no hay clientes financiados con seña abonada."}
          </p>
        )}
        {clientesFiltrados.map((c) => (
          <TarjetaCliente key={c.leadId} cliente={c} />
        ))}
      </div>
    </div>
  );
}
