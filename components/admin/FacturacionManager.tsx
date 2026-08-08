"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { crearGastoAction, eliminarGastoAction } from "@/lib/admin/actions";
import { formatArs, formatUsd } from "@/lib/utils";
import type { Gasto, Lead, Proyecto } from "@/types/site";

const inputClass = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function claveMes(fechaIso: string) {
  return fechaIso.slice(0, 7); // "YYYY-MM"
}

function labelMes(clave: string) {
  const [anio, mes] = clave.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", { month: "short", year: "2-digit" });
}

function hoy() {
  return new Date().toISOString().slice(0, 10);
}

export default function FacturacionManager({
  leads,
  gastos,
  proyectos,
}: {
  leads: Lead[];
  gastos: Gasto[];
  proyectos: Proyecto[];
}) {
  const [proyectoFiltro, setProyectoFiltro] = useState("");
  const [pending, startTransition] = useTransition();
  const [gastoState, gastoFormAction, gastoPending] = useActionState(crearGastoAction, null);

  const leadsFiltrados = useMemo(
    () => (proyectoFiltro ? leads.filter((l) => l.proyectoId === proyectoFiltro) : leads),
    [leads, proyectoFiltro]
  );
  const gastosFiltrados = useMemo(
    () => (proyectoFiltro ? gastos.filter((g) => g.proyectoId === proyectoFiltro) : gastos),
    [gastos, proyectoFiltro]
  );

  const porMes = useMemo(() => {
    const mapa = new Map<
      string,
      { ingresosUsd: number; comisionesUsd: number; honorariosUsd: number; honorariosArs: number; gastosArs: number }
    >();
    const asegurar = (clave: string) => {
      if (!mapa.has(clave))
        mapa.set(clave, { ingresosUsd: 0, comisionesUsd: 0, honorariosUsd: 0, honorariosArs: 0, gastosArs: 0 });
      return mapa.get(clave)!;
    };

    for (const lead of leadsFiltrados) {
      if (!lead.importeCobrado && !lead.comisionUsd && !lead.honorariosUsd && !lead.honorariosArs && !lead.gastosArs)
        continue;
      const fila = asegurar(claveMes(lead.actualizadoEn));
      fila.ingresosUsd += lead.importeCobrado ?? 0;
      fila.comisionesUsd += lead.comisionUsd ?? 0;
      fila.honorariosUsd += lead.honorariosUsd ?? 0;
      fila.honorariosArs += lead.honorariosArs ?? 0;
      fila.gastosArs += lead.gastosArs ?? 0;
    }
    for (const gasto of gastosFiltrados) {
      const fila = asegurar(claveMes(gasto.fecha));
      fila.gastosArs += gasto.montoArs;
    }

    return Array.from(mapa.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([clave, valores]) => ({
        mes: labelMes(clave),
        ...valores,
        totalUsd: valores.ingresosUsd + valores.comisionesUsd + valores.honorariosUsd,
        netoArs: valores.honorariosArs - valores.gastosArs,
      }));
  }, [leadsFiltrados, gastosFiltrados]);

  const totales = useMemo(
    () =>
      porMes.reduce(
        (acc, m) => ({
          ingresosUsd: acc.ingresosUsd + m.ingresosUsd,
          comisionesUsd: acc.comisionesUsd + m.comisionesUsd,
          honorariosUsd: acc.honorariosUsd + m.honorariosUsd,
          honorariosArs: acc.honorariosArs + m.honorariosArs,
          gastosArs: acc.gastosArs + m.gastosArs,
          totalUsd: acc.totalUsd + m.totalUsd,
          netoArs: acc.netoArs + m.netoArs,
        }),
        { ingresosUsd: 0, comisionesUsd: 0, honorariosUsd: 0, honorariosArs: 0, gastosArs: 0, totalUsd: 0, netoArs: 0 }
      ),
    [porMes]
  );

  const eliminarGasto = (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    startTransition(() => {
      eliminarGastoAction(id);
    });
  };

  const tarjetasUsd = [
    { label: "Ingresos", valor: totales.ingresosUsd },
    { label: "Comisiones", valor: totales.comisionesUsd },
    { label: "Honorarios", valor: totales.honorariosUsd },
    { label: "Total USD", valor: totales.totalUsd, destacado: true },
  ];
  const tarjetasArs = [
    { label: "Honorarios", valor: totales.honorariosArs },
    { label: "Gastos", valor: totales.gastosArs },
    { label: "Neto ARS", valor: totales.netoArs, destacado: true },
  ];

  return (
    <div className="space-y-8">
      <div className="max-w-xs">
        <label className={labelClass}>Proyecto</label>
        <select value={proyectoFiltro} onChange={(e) => setProyectoFiltro(e.target.value)} className={inputClass}>
          <option value="">Todos los proyectos</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-black/40">En dólares (USD)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tarjetasUsd.map((t) => (
            <div key={t.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs text-brand-black/50">{t.label}</p>
              <p className={`mt-1 font-display text-lg font-bold ${t.destacado ? "text-brand-green-700" : "text-brand-black"}`}>
                {formatUsd(t.valor)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-black/40">En pesos (ARS)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tarjetasArs.map((t) => (
            <div key={t.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
              <p className="text-xs text-brand-black/50">{t.label}</p>
              <p
                className={`mt-1 font-display text-lg font-bold ${
                  t.destacado ? (t.valor >= 0 ? "text-brand-green-700" : "text-red-600") : "text-brand-black"
                }`}
              >
                {formatArs(t.valor)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {porMes.length === 0 ? (
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-brand-black/50 shadow-sm">
          Todavía no hay ingresos, comisiones, honorarios o gastos cargados para graficar.
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h3 className="mb-1 font-display text-lg font-bold text-brand-black">Ingresos, comisiones y honorarios por mes (USD)</h3>
            <p className="mb-4 text-xs text-brand-black/50">
              Se agrupan por la fecha de última actualización del lead.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatUsd(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="ingresosUsd" name="Ingresos" fill="#237046" radius={[4, 4, 0, 0]} />
                <Bar dataKey="comisionesUsd" name="Comisiones" fill="#d4af37" radius={[4, 4, 0, 0]} />
                <Bar dataKey="honorariosUsd" name="Honorarios" fill="#96741f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h3 className="mb-1 font-display text-lg font-bold text-brand-black">Honorarios y gastos por mes (ARS)</h3>
            <p className="mb-4 text-xs text-brand-black/50">
              Los honorarios y gastos por cliente se agrupan por la fecha de última actualización del lead; los
              gastos generales, por su fecha cargada.
            </p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={porMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip formatter={(v) => formatArs(Number(v))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="honorariosArs" name="Honorarios" fill="#96741f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastosArs" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-black/10 text-brand-black/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Mes</th>
                  <th className="px-4 py-3 font-medium text-right">Ingresos USD</th>
                  <th className="px-4 py-3 font-medium text-right">Comisiones USD</th>
                  <th className="px-4 py-3 font-medium text-right">Honorarios USD</th>
                  <th className="px-4 py-3 font-medium text-right">Total USD</th>
                  <th className="px-4 py-3 font-medium text-right">Honorarios ARS</th>
                  <th className="px-4 py-3 font-medium text-right">Gastos ARS</th>
                  <th className="px-4 py-3 font-medium text-right">Neto ARS</th>
                </tr>
              </thead>
              <tbody>
                {porMes.map((m) => (
                  <tr key={m.mes} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3 font-medium capitalize">{m.mes}</td>
                    <td className="px-4 py-3 text-right">{formatUsd(m.ingresosUsd)}</td>
                    <td className="px-4 py-3 text-right">{formatUsd(m.comisionesUsd)}</td>
                    <td className="px-4 py-3 text-right">{formatUsd(m.honorariosUsd)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-green-700">{formatUsd(m.totalUsd)}</td>
                    <td className="px-4 py-3 text-right">{formatArs(m.honorariosArs)}</td>
                    <td className="px-4 py-3 text-right">{formatArs(m.gastosArs)}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${m.netoArs >= 0 ? "text-brand-green-700" : "text-red-600"}`}>
                      {formatArs(m.netoArs)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Cargar gasto general (ARS)</h2>
        <p className="mb-4 text-xs text-brand-black/50">
          Para gastos que no son de un cliente puntual (marketing, oficina, etc.). Los gastos de una venta puntual se
          cargan en la tarjeta del cliente en el CRM.
        </p>
        <form action={gastoFormAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className={labelClass}>Fecha</label>
            <input type="date" name="fecha" defaultValue={hoy()} required className={inputClass} />
          </div>
          <div className="lg:col-span-2">
            <label className={labelClass}>Concepto</label>
            <input name="concepto" placeholder="Ej. Marketing, oficina" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Categoría (opcional)</label>
            <input name="categoria" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Monto (ARS)</label>
            <input type="number" name="montoArs" min="0.01" step="0.01" required className={inputClass} />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <label className={labelClass}>Proyecto (opcional)</label>
            <select name="proyectoId" defaultValue="" className={inputClass}>
              <option value="">Gasto general (sin proyecto)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={gastoPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
        </form>
        {gastoState && !gastoState.ok && <p className="mt-2 text-xs text-red-600">{gastoState.error}</p>}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium">Categoría</th>
              <th className="px-4 py-3 font-medium">Proyecto</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {gastosFiltrados.map((g) => (
              <tr key={g.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3">{new Date(`${g.fecha}T00:00:00`).toLocaleDateString("es-AR")}</td>
                <td className="px-4 py-3">{g.concepto}</td>
                <td className="px-4 py-3 text-brand-black/60">{g.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-brand-black/60">{g.proyectoNombre ?? "General"}</td>
                <td className="px-4 py-3 text-right">{formatArs(g.montoArs)}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => eliminarGasto(g.id)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    <Trash2 className="inline h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {gastosFiltrados.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-brand-black/40">
                  Todavía no hay gastos generales cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
