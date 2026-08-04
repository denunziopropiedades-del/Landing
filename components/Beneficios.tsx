"use client";

import { motion } from "framer-motion";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Beneficio } from "@/types/site";

export default function Beneficios({ beneficios }: { beneficios: Beneficio[] }) {
  return (
    <section id="proyecto" className="bg-brand-black py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Beneficios de invertir acá</h2>
          <p className="mt-3 text-white/70">Todo lo que respalda tu inversión inmobiliaria.</p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {beneficios.map((b, i) => {
            const Icon = (Icons[b.icono as keyof typeof Icons] ?? Icons.CheckCircle2) as LucideIcon;
            return (
              <motion.div
                key={b.titulo}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: i * 0.06 }}
                className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center transition hover:border-brand-gold-400/50 hover:bg-white/[0.06]"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-gold-500/15">
                  <Icon className="h-7 w-7 text-brand-gold-400" strokeWidth={1.75} />
                </span>
                <p className="text-sm font-medium text-white/90">{b.titulo}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
