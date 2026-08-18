"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { actualizarConfiguracionAction } from "@/lib/candidatos/actions";
import type { ConfiguracionCandidatos } from "@/types/candidatos";

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-obra-slate-950 focus:border-obra-orange-400 focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-slate-600";
const section = "space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";

const PESOS_FIELDS: { key: keyof ConfiguracionCandidatos["pesos"]; label: string }[] = [
  { key: "experiencia", label: "Años de experiencia" },
  { key: "cargo", label: "Cargo" },
  { key: "especialidad", label: "Especialidad definida" },
  { key: "disponibilidad", label: "Disponibilidad" },
  { key: "pretensionSalarial", label: "Pretensión salarial" },
  { key: "referencias", label: "Referencias laborales" },
  { key: "herramientas", label: "Herramientas propias" },
  { key: "movilidad", label: "Movilidad propia" },
];

export default function ConfiguracionForm({ config }: { config: ConfiguracionCandidatos }) {
  const [state, formAction, pending] = useActionState(actualizarConfiguracionAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className={section}>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-obra-orange-600">Pesos del puntaje automático</p>
          <p className="mt-1 text-xs text-slate-500">
            Cada factor suma puntos según su peso. No hace falta que sumen 100: se normalizan automáticamente.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PESOS_FIELDS.map((f) => (
            <div key={f.key}>
              <label className={label}>{f.label}</label>
              <input
                type="number"
                min={0}
                max={100}
                name={`pesos.${f.key}`}
                defaultValue={config.pesos[f.key]}
                className={input}
              />
            </div>
          ))}
        </div>
        <div>
          <label className={label}>Salario de referencia diario ($ ARS)</label>
          <p className="mb-1.5 text-xs text-slate-500">
            Pretensiones por debajo de este valor suman más puntos; muy por encima, restan.
          </p>
          <input type="number" name="salarioReferencia" defaultValue={config.salarioReferencia} className={input} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" name="recalcular" className="h-4 w-4 accent-obra-orange-500" />
          Recalcular el puntaje de todos los candidatos existentes con estos nuevos pesos
        </label>
      </div>

      <div className={section}>
        <p className="text-sm font-semibold uppercase tracking-wide text-obra-orange-600">Mensaje de WhatsApp</p>
        <p className="text-xs text-slate-500">
          Variables disponibles: <code className="rounded bg-slate-100 px-1">{"{{nombre}}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1">{"{{cargo}}"}</code>{" "}
          <code className="rounded bg-slate-100 px-1">{"{{localidad}}"}</code>
        </p>
        <textarea rows={4} name="mensajeWhatsapp" defaultValue={config.mensajeWhatsapp} className={input} />
      </div>

      {state && (state.ok ? <p className="text-sm text-emerald-600">Configuración guardada.</p> : <p className="text-sm text-red-600">{state.error}</p>)}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-obra-orange-500 px-8 py-3 font-semibold text-white transition hover:bg-obra-orange-400 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Guardar configuración
      </button>
    </form>
  );
}
