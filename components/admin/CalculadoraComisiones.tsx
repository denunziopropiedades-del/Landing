"use client";

import { useMemo, useState } from "react";
import { formatUsd } from "@/lib/utils";

const PORCENTAJES = [3, 4, 5, 6, 7, 8, 9, 10];

const inputClass = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

export default function CalculadoraComisiones() {
  const [precioVenta, setPrecioVenta] = useState("");
  const [pctComprador, setPctComprador] = useState(3);
  const [pctVendedor, setPctVendedor] = useState(3);

  const precio = Number(precioVenta) || 0;

  const { comisionComprador, comisionVendedor, total } = useMemo(() => {
    const comisionComprador = precio * (pctComprador / 100);
    const comisionVendedor = precio * (pctVendedor / 100);
    return { comisionComprador, comisionVendedor, total: comisionComprador + comisionVendedor };
  }, [precio, pctComprador, pctVendedor]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Precio de venta (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={precioVenta}
              onChange={(e) => setPrecioVenta(e.target.value)}
              placeholder="0"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>% Comisión comprador</label>
            <select value={pctComprador} onChange={(e) => setPctComprador(Number(e.target.value))} className={inputClass}>
              {PORCENTAJES.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>% Comisión vendedor</label>
            <select value={pctVendedor} onChange={(e) => setPctVendedor(Number(e.target.value))} className={inputClass}>
              {PORCENTAJES.map((p) => (
                <option key={p} value={p}>
                  {p}%
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-brand-black/50">El porcentaje siempre se calcula sobre el precio de venta.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-xs text-brand-black/50">Comisión comprador ({pctComprador}%)</p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">{formatUsd(comisionComprador)}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <p className="text-xs text-brand-black/50">Comisión vendedor ({pctVendedor}%)</p>
          <p className="mt-1 font-display text-xl font-bold text-brand-black">{formatUsd(comisionVendedor)}</p>
        </div>
        <div className="rounded-2xl border border-black/5 bg-brand-green-700 p-5 shadow-sm">
          <p className="text-xs text-white/70">Comisión total</p>
          <p className="mt-1 font-display text-xl font-bold text-white">{formatUsd(total)}</p>
        </div>
      </div>
    </div>
  );
}
