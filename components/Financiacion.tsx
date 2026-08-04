"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import type { ConfigFinanciacion, LoteTipo } from "@/types/site";
import { formatUsd } from "@/lib/utils";

export default function Financiacion({
  lotes,
  config,
}: {
  lotes: LoteTipo[];
  config: ConfigFinanciacion;
}) {
  const [loteId, setLoteId] = useState(lotes[0]?.id);
  const [anticipoPct, setAnticipoPct] = useState(config.anticipoMinimoPct);
  const [cuotas, setCuotas] = useState(config.cuotasOpciones[0]);

  const lote = lotes.find((l) => l.id === loteId) ?? lotes[0];

  const resultado = useMemo(() => {
    if (!lote) return null;
    const anticipo = Math.round((lote.precioUsd * anticipoPct) / 100);
    const saldo = lote.precioUsd - anticipo;
    const interesTotal = saldo * (config.interesAnualPct / 100) * (cuotas / 12);
    const totalFinanciado = saldo + interesTotal;
    const valorCuota = totalFinanciado / cuotas;
    return { anticipo, saldo, valorCuota, totalAPagar: anticipo + totalFinanciado };
  }, [lote, anticipoPct, cuotas, config.interesAnualPct]);

  if (!lote || !resultado) return null;

  return (
    <section id="financiacion" className="bg-brand-black py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Financiación</h2>
          <p className="mt-3 text-white/70">Simulá tu plan de pagos y encontrá la cuota ideal para vos.</p>
        </div>

        <div className="mt-14 grid gap-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 lg:grid-cols-2 lg:p-12">
          <div className="space-y-7">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Tipo de lote</label>
              <select
                value={loteId}
                onChange={(e) => setLoteId(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-3 text-white focus:border-brand-gold-400 focus:outline-none"
              >
                {lotes.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.nombre} — {formatUsd(l.precioUsd)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 flex justify-between text-sm font-medium text-white/80">
                <span>Anticipo</span>
                <span className="text-brand-gold-400">{anticipoPct}%</span>
              </label>
              <input
                type="range"
                min={config.anticipoMinimoPct}
                max={config.anticipoMaximoPct}
                value={anticipoPct}
                onChange={(e) => setAnticipoPct(Number(e.target.value))}
                className="w-full accent-brand-gold-500"
              />
              <div className="mt-1 flex justify-between text-xs text-white/50">
                <span>{config.anticipoMinimoPct}%</span>
                <span>{config.anticipoMaximoPct}%</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Cantidad de cuotas</label>
              <div className="flex flex-wrap gap-2">
                {config.cuotasOpciones.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCuotas(c)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      cuotas === c
                        ? "border-brand-gold-500 bg-brand-gold-500 text-brand-black"
                        : "border-white/15 text-white/70 hover:border-white/40"
                    }`}
                  >
                    {c} meses
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-xl bg-white p-8">
            <div className="mb-4 flex items-center gap-2 text-brand-green-700">
              <Calculator className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Tu plan estimado</span>
            </div>
            <dl className="space-y-4 text-brand-black">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <dt className="text-sm text-brand-black/60">Precio del lote</dt>
                <dd className="font-semibold">{formatUsd(lote.precioUsd)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <dt className="text-sm text-brand-black/60">Anticipo ({anticipoPct}%)</dt>
                <dd className="font-semibold">{formatUsd(resultado.anticipo)}</dd>
              </div>
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <dt className="text-sm text-brand-black/60">Saldo a financiar</dt>
                <dd className="font-semibold">{formatUsd(resultado.saldo)}</dd>
              </div>
              <div className="flex items-center justify-between pt-1">
                <dt className="font-display text-lg text-brand-black">Cuota estimada</dt>
                <dd className="font-display text-3xl font-extrabold text-brand-green-700">
                  {formatUsd(Math.round(resultado.valorCuota))}
                  <span className="ml-1 text-sm font-normal text-brand-black/50">/mes</span>
                </dd>
              </div>
            </dl>
            <p className="mt-6 text-xs text-brand-black/45">
              Valores estimados en USD, sujetos a confirmación con nuestro equipo comercial. No constituye una oferta
              vinculante.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
