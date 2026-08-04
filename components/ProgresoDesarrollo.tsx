"use client";

import { motion } from "framer-motion";
import type { ProgresoItem } from "@/types/site";

export default function ProgresoDesarrollo({ progreso }: { progreso: ProgresoItem[] }) {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Estado del desarrollo</h2>
          <p className="mt-3 text-brand-black/70">Avance real de obra, actualizado por nuestro equipo técnico.</p>
        </div>

        <div className="mt-14 space-y-8">
          {progreso.map((item, i) => (
            <div key={item.id}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-brand-black">{item.etapa}</span>
                <span className="font-semibold text-brand-green-700">{item.porcentaje}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-black/5">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${item.porcentaje}%` }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 1, delay: i * 0.08, ease: "easeOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-brand-green-600 to-brand-gold-500"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
