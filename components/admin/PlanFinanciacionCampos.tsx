"use client";

import type { ChangeEvent } from "react";
import { formatMoneda } from "@/lib/utils";
import type { PlanFinanciacionFijo } from "@/types/site";

export type PlanEditable = { anticipoUsd: string; cuotas: string; valorCuotaUsd: string; moneda: "USD" | "ARS" };

export const planVacio: PlanEditable = { anticipoUsd: "", cuotas: "", valorCuotaUsd: "", moneda: "USD" };

export function planAEditable(plan: PlanFinanciacionFijo | null | undefined): PlanEditable {
  if (!plan) return planVacio;
  return {
    anticipoUsd: String(plan.anticipoUsd),
    cuotas: String(plan.cuotas),
    valorCuotaUsd: String(plan.valorCuotaUsd),
    moneda: plan.moneda === "ARS" ? "ARS" : "USD",
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
  const mon = plan.moneda === "ARS" ? "$" : "USD";
  const set = (k: keyof PlanEditable) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...plan, [k]: e.target.value });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className={label.replace("mb-1 block ", "")}>Moneda del plan</span>
        {conNombres && <input type="hidden" name="monedaPlan" value={plan.moneda} />}
        <div className="inline-flex rounded-full border border-black/10 p-0.5">
          {(["USD", "ARS"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...plan, moneda: m })}
              className={`rounded-full px-3 py-0.5 text-xs font-semibold ${plan.moneda === m ? "bg-brand-green-700 text-white" : "text-brand-black/60"}`}
            >
              {m === "USD" ? "Dólares" : "Pesos"}
            </button>
          ))}
        </div>
      </div>
      {planesSugeridos.length > 0 && plan.moneda === "USD" && (
        <div className="flex flex-wrap gap-1.5">
          {planesSugeridos.map((p, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange(planAEditable(p))}
              className="rounded-full border border-brand-green-700/30 px-2.5 py-1 text-[11px] font-medium text-brand-green-700 hover:bg-brand-green-700/5"
            >
              {formatMoneda(p.anticipoUsd, p.moneda)} + {p.cuotas} × {formatMoneda(p.valorCuotaUsd, p.moneda)}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        <div>
          <label className={label}>Anticipo ({mon})</label>
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
          <label className={label}>Valor cuota ({mon})</label>
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
