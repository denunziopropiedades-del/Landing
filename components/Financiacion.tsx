"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import type { ConfigFinanciacion, LoteTipo } from "@/types/site";
import { formatUsd } from "@/lib/utils";

export default function Financiacion({
  tiposLotes,
  config,
}: {
  tiposLotes: LoteTipo[];
  config: ConfigFinanciacion;
}) {
  const [nombreLote, setNombreLote] = useState(tiposLotes[0]?.nombre);
  const [anticipoPct, setAnticipoPct] = useState(config.anticipoMinimoPct);
  const [cuotas, setCuotas] = useState(config.cuotasOpciones[0]);

  const lote = tiposLotes.find((l) => l.nombre === nombreLote) ?? tiposLotes[0];

  const planFijo = useMemo(() => {
    if (!lote || lote.anticipoFinanciadoUsd === null || lote.cuotasFinanciado === null || lote.valorCuotaFinanciadoUsd === null) {
      return null;
    }
    return { anticipo: lote.anticipoFinanciadoUsd, cuotas: lote.cuotasFinanciado, valorCuota: lote.valorCuotaFinanciadoUsd };
  }, [lote]);

  const resultado = useMemo(() => {
    if (!lote || planFijo) return null;
    const anticipo = Math.round((lote.precioUsd * anticipoPct) / 100);
    const saldoRestante = lote.precioUsd - anticipo;
    const interesTotal = saldoRestante * (config.interesAnualPct / 100) * (cuotas / 12);
    const totalFinanciado = saldoRestante + interesTotal;
    const valorCuota = totalFinanciado / cuotas;
    return { anticipo, saldoRestante, interesTotal, valorCuota, totalAPagar: anticipo + totalFinanciado };
  }, [lote, planFijo, anticipoPct, cuotas, config.interesAnualPct]);

  const hayCalculadora = Boolean(lote && (resultado || planFijo));
  if (!hayCalculadora && config.planesFijos.length === 0) return null;

  return (
    <section id="financiacion" className="bg-brand-black py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Financiación</h2>
          <p className="mt-3 text-white/70">Simulá tu plan de pagos y encontrá la cuota ideal para vos.</p>
        </div>

        {config.planesFijos.length > 0 && (
          <div className="mt-14">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-brand-gold-400">
              Planes de financiación
            </p>
            <div
              className={`mt-5 grid gap-4 ${
                config.planesFijos.length === 1
                  ? "mx-auto max-w-sm"
                  : config.planesFijos.length === 2
                    ? "sm:grid-cols-2"
                    : "sm:grid-cols-3"
              }`}
            >
              {config.planesFijos.map((plan, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.04] p-6 text-center">
                  <p className="text-xs uppercase tracking-wide text-white/50">Anticipo</p>
                  <p className="font-display text-2xl font-bold text-white">{formatUsd(plan.anticipoUsd)}</p>
                  <p className="mt-4 text-sm text-white/70">
                    en <span className="font-semibold text-brand-gold-400">{plan.cuotas} cuotas</span> de
                  </p>
                  <p className="font-display text-xl font-bold text-brand-gold-400">
                    {formatUsd(plan.valorCuotaUsd)}
                    <span className="ml-1 text-sm font-normal text-white/50">/mes</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {hayCalculadora && lote && (
        <div className="mt-14 grid gap-10 rounded-2xl border border-white/10 bg-white/[0.03] p-8 lg:grid-cols-2 lg:p-12">
          <div className="space-y-7">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Tipo de lote</label>
              <select
                value={nombreLote}
                onChange={(e) => setNombreLote(e.target.value)}
                className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-3 text-white focus:border-brand-gold-400 focus:outline-none"
              >
                {tiposLotes.map((l) => (
                  <option key={l.nombre} value={l.nombre}>
                    {l.nombre} — {formatUsd(l.precioUsd)}
                  </option>
                ))}
              </select>
            </div>

            {planFijo ? (
              <p className="text-sm text-white/60">
                Este lote tiene un plan de financiación fijo, sin necesidad de simulador: anticipo y cuotas a valor fijo
                en dólares.
              </p>
            ) : (
              <>
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
              </>
            )}
          </div>

          <div className="flex flex-col justify-center rounded-xl bg-white p-8">
            <div className="mb-4 flex items-center gap-2 text-brand-green-700">
              <Calculator className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">
                {planFijo ? "Tu plan de financiación" : "Tu plan estimado"}
              </span>
            </div>
            {planFijo ? (
              <dl className="space-y-3 text-brand-black">
                <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                  <dt className="text-sm text-brand-black/60">Precio de contado (precio final)</dt>
                  <dd className="font-semibold">{formatUsd(lote.precioUsd)}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                  <dt className="text-sm text-brand-black/60">Anticipo</dt>
                  <dd className="font-semibold">{formatUsd(planFijo.anticipo)}</dd>
                </div>
                <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                  <dt className="text-sm text-brand-black/60">Cantidad de cuotas</dt>
                  <dd className="font-semibold">{planFijo.cuotas}</dd>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <dt className="font-display text-lg text-brand-black">Valor de la cuota</dt>
                  <dd className="font-display text-3xl font-extrabold text-brand-green-700">
                    {formatUsd(planFijo.valorCuota)}
                    <span className="ml-1 text-sm font-normal text-brand-black/50">/mes</span>
                  </dd>
                </div>
              </dl>
            ) : (
              resultado && (
                <dl className="space-y-3 text-brand-black">
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <dt className="text-sm text-brand-black/60">Precio de contado (precio final)</dt>
                    <dd className="font-semibold">{formatUsd(lote.precioUsd)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <dt className="text-sm text-brand-black/60">Anticipo ({anticipoPct}%)</dt>
                    <dd className="font-semibold">{formatUsd(resultado.anticipo)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <dt className="text-sm text-brand-black/60">Saldo restante a financiar</dt>
                    <dd className="font-semibold">{formatUsd(resultado.saldoRestante)}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <dt className="text-sm text-brand-black/60">Interés total ({config.interesAnualPct}% anual)</dt>
                    <dd className="font-semibold">{formatUsd(Math.round(resultado.interesTotal))}</dd>
                  </div>
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <dt className="text-sm text-brand-black/60">Cantidad de cuotas</dt>
                    <dd className="font-semibold">{cuotas}</dd>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <dt className="font-display text-lg text-brand-black">Valor de la cuota</dt>
                    <dd className="font-display text-3xl font-extrabold text-brand-green-700">
                      {formatUsd(Math.round(resultado.valorCuota))}
                      <span className="ml-1 text-sm font-normal text-brand-black/50">/mes</span>
                    </dd>
                  </div>
                </dl>
              )
            )}
            <p className="mt-6 text-xs text-brand-black/45">
              Valores estimados en USD, sujetos a confirmación con nuestro equipo comercial. No constituye una oferta
              vinculante.
            </p>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
