"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, MessageCircle, Scale } from "lucide-react";
import type { LoteTipo } from "@/types/site";
import { cn, formatUsd } from "@/lib/utils";
import { buildWhatsappUrl, mensajeConsultaLote } from "@/lib/whatsapp";

export default function LotesGrid({ tiposLotes, numero }: { tiposLotes: LoteTipo[]; numero?: string }) {
  const [comparar, setComparar] = useState<string[]>([]);

  const toggleComparar = (id: string) => {
    setComparar((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const lotesComparados = useMemo(
    () => tiposLotes.filter((l) => comparar.includes(l.nombre)),
    [tiposLotes, comparar]
  );

  return (
    <section id="lotes" className="bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Lotes disponibles</h2>
          <p className="mt-3 text-brand-black/70">
            Elegí la superficie que mejor se adapta a tu proyecto. Todos con escritura garantizada.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {tiposLotes.map((lote, i) => (
            <motion.div
              key={lote.nombre}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl",
                lote.destacado ? "border-brand-gold-400 ring-2 ring-brand-gold-400/40" : "border-black/5"
              )}
            >
              {lote.destacado && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-gold-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-brand-black">
                  Más elegido
                </span>
              )}

              <h3 className="font-display text-2xl font-bold text-brand-black">{lote.nombre}</h3>
              <p className="mt-1 text-sm text-brand-black/60">{lote.dimensiones} metros</p>

              <p className="mt-6 font-display text-4xl font-extrabold text-brand-green-700">
                {formatUsd(lote.precioUsd)}
              </p>
              {typeof lote.disponibles === "number" && (
                <p className="mt-1 text-xs text-brand-black/50">{lote.disponibles} lotes disponibles</p>
              )}

              <ul className="mt-6 space-y-2 text-sm text-brand-black/75">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-green-600" /> Escritura garantizada
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-green-600" /> Financiación disponible
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-green-600" /> Barrio perimetrado
                </li>
              </ul>

              <div className="mt-8 flex flex-col gap-3">
                <a
                  href={buildWhatsappUrl(mensajeConsultaLote(lote.nombre), numero)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-green-600"
                >
                  <MessageCircle className="h-4 w-4" />
                  Consultar
                </a>
                <button
                  type="button"
                  onClick={() => toggleComparar(lote.nombre)}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium transition",
                    comparar.includes(lote.nombre)
                      ? "border-brand-gold-500 bg-brand-gold-100 text-brand-gold-700"
                      : "border-black/10 text-brand-black/70 hover:border-brand-black/30"
                  )}
                >
                  <Scale className="h-4 w-4" />
                  {comparar.includes(lote.nombre) ? "Quitar de comparación" : "Comparar"}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {lotesComparados.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-14 overflow-x-auto rounded-2xl border border-black/5 bg-white p-6 shadow-sm"
          >
            <h3 className="mb-4 font-display text-xl font-bold text-brand-black">Comparador de lotes</h3>
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/10 text-brand-black/60">
                  <th className="py-2 pr-4 font-medium">Lote</th>
                  <th className="py-2 pr-4 font-medium">Superficie</th>
                  <th className="py-2 pr-4 font-medium">Precio</th>
                  <th className="py-2 pr-4 font-medium">USD / m²</th>
                </tr>
              </thead>
              <tbody>
                {lotesComparados.map((lote) => (
                  <tr key={lote.nombre} className="border-b border-black/5 last:border-0">
                    <td className="py-3 pr-4 font-semibold text-brand-black">{lote.nombre}</td>
                    <td className="py-3 pr-4">{lote.superficieM2} m²</td>
                    <td className="py-3 pr-4">{formatUsd(lote.precioUsd)}</td>
                    <td className="py-3 pr-4">{formatUsd(Math.round(lote.precioUsd / lote.superficieM2))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>
    </section>
  );
}
