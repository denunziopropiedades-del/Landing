"use client";

import { motion } from "framer-motion";
import { ChevronDown, MessageCircle } from "lucide-react";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import type { SiteTextos } from "@/types/site";

export default function Hero({ textos }: { textos: SiteTextos }) {
  return (
    <section id="inicio" className="relative flex min-h-[92vh] items-center overflow-hidden bg-brand-black">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=2400&auto=format&fit=crop')",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-brand-black" aria-hidden />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/20 to-transparent" aria-hidden />

      <div className="relative z-10 mx-auto max-w-7xl px-4 pb-20 pt-32 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-4 inline-block rounded-full border border-brand-gold-400/60 bg-black/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-gold-300"
        >
          Etapa 2 · Guernica, Buenos Aires
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl"
        >
          {textos.heroTitulo}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="mt-6 max-w-xl text-lg text-white/85 sm:text-xl"
        >
          {textos.heroSubtitulo}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="mt-10 flex flex-col gap-4 sm:flex-row"
        >
          <a
            href={buildWhatsappUrl(textos.whatsappMensajeDefault, textos.whatsappNumero)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-gold-500 px-8 py-4 text-base font-semibold text-brand-black shadow-lg shadow-black/30 transition hover:bg-brand-gold-400"
          >
            <MessageCircle className="h-5 w-5" />
            Solicitar información
          </a>
          <a
            href="#lotes"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-8 py-4 text-base font-semibold text-white transition hover:border-brand-gold-400 hover:text-brand-gold-400"
          >
            Ver lotes disponibles
            <ChevronDown className="h-5 w-5" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
