"use client";

import type { ChangeEvent } from "react";
import { formatUsd } from "@/lib/utils";
import type { PlanFinanciacionFijo } from "@/types/site";

export type PlanEditable = { anticipoUsd: string; cuotas: string; valorCuotaUsd: string };

export const planVacio: PlanEditable = { anticipoUsd: "", cuotas: "", valorCuotaUsd: "" };

export function planAEditable(plan: PlanFinanciacionFijo | null | undefined): PlanEditable {
  if (!plan) return planVacio;
  return {
    anticipoUsd: String(plan.anticipoUsd),
    cuotas: String(plan.cuotas),
    valorCuotaUsd: String(plan.valorCuotaUsd),
  };
}

/** Anticipo / cuotas / valor de cuota, con atajos a los planes fijos del desarrollo. */
export default function PlanFinanciacionCampos({
  plan,
  onChange,
  planesSugeridos,
  compacto = false,
  conNombres = false,
}: {
  plan: PlanEditable;
  onChange: (plan: PlanEditable) => void;
  planesSugeridos: PlanFinanciacionFijo[];
  compacto?: boolean;
  /** Si es true, los inputs llevan `name` para enviarse dentro de un <form>. */
  conNombres?: boolean;
}) {
  const input = compacto
    ? "w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
    : "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
  const label = compacto
    ? "mb-1 block text-[11px] font-medium text-brand-black/50"
    : "mb-1 block text-xs font-medium text-brand-black/70";
  const set = (k: keyof PlanEditable) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...plan, [k]: e.target.value });

  return (
    <div className="space-y-2">
      {planesSugeridos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {planesSugeridos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(planAEditable(p))}
              className="rounded-full border border-brand-green-700/30 px-2.5 py-1 text-[11px] font-medium text-brand-green-700 hover:bg-brand-green-700/5"
            >
              {formatUsd(p.anticipoUsd)} + {p.cuotas} × {formatUsd(p.valorCuotaUsd)}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className={label}>Anticipo (USD)</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            name={conNombres ? "anticipoUsd" : undefined}
            value={plan.anticipoUsd}
            onChange={set("anticipoUsd")}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Cuotas</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            name={conNombres ? "cuotas" : undefined}
            value={plan.cuotas}
            onChange={set("cuotas")}
            className={input}
          />
        </div>
        <div>
          <label className={label}>Valor cuota (USD)</label>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            name={conNombres ? "valorCuotaUsd" : undefined}
            value={plan.valorCuotaUsd}
            onChange={set("valorCuotaUsd")}
            className={input}
          />
        </div>
      </div>
    </div>
  );
}
