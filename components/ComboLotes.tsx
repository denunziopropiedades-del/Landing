import { Check } from "lucide-react";
import { formatUsd } from "@/lib/utils";
import type { ComboLotes as ComboLotesType } from "@/types/site";

export default function ComboLotes({ combo }: { combo: ComboLotesType | null }) {
  const opciones = [
    { cantidad: 1, label: combo?.label1Lote ?? "1 lote", precio: combo?.precio1LoteUsd },
    { cantidad: 2, label: combo?.label2Lotes ?? "2 lotes juntos", precio: combo?.precio2LotesUsd },
    { cantidad: 3, label: combo?.label3Lotes ?? "3 lotes juntos", precio: combo?.precio3LotesUsd },
  ].filter((o) => o.precio !== null && o.precio !== undefined);

  if (opciones.length === 0) return null;

  const beneficios = [combo?.beneficio1, combo?.beneficio2, combo?.beneficio3].filter(
    (b): b is string => !!b && b.trim().length > 0
  );

  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">¿Comprás más de un lote?</h2>
          <p className="mt-3 text-brand-black/70">
            Si querés combinar varios lotes contiguos en una sola operación, este es el precio total.
          </p>
        </div>

        <div
          className={`mx-auto mt-10 grid max-w-4xl gap-6 ${
            { 1: "sm:grid-cols-1 max-w-xs", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3" }[opciones.length]
          }`}
        >
          {opciones.map((o) => (
            <div
              key={o.cantidad}
              className="rounded-2xl border border-black/5 bg-brand-cream/60 p-6 text-center shadow-sm"
            >
              <p className="font-display text-lg font-bold text-brand-black">{o.label}</p>
              <p className="mt-3 font-display text-3xl font-bold text-brand-green-700">{formatUsd(o.precio!)}</p>
              {beneficios.length > 0 && (
                <div className="mt-3 space-y-1">
                  {beneficios.map((b) => (
                    <p key={b} className="flex items-center justify-center gap-1.5 text-xs text-brand-black/60">
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-green-700" />
                      {b}
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
