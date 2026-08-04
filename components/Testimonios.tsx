"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import type { Testimonio } from "@/types/site";

export default function Testimonios({ testimonios }: { testimonios: Testimonio[] }) {
  const [index, setIndex] = useState(0);

  if (testimonios.length === 0) return null;

  const t = testimonios[index];
  const next = () => setIndex((i) => (i + 1) % testimonios.length);
  const prev = () => setIndex((i) => (i - 1 + testimonios.length) % testimonios.length);

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        <div className="relative mt-14">
          <AnimatePresence mode="wait">
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
              className="flex flex-col items-center rounded-2xl border border-black/5 bg-brand-cream p-10 text-center shadow-sm"
            >
              <div className="relative h-16 w-16 overflow-hidden rounded-full">
                <Image src={t.foto} alt={t.nombre} fill sizes="64px" className="object-cover" />
              </div>
              <div className="mt-4 flex gap-1">
                {Array.from({ length: t.estrellas }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-brand-gold-500 text-brand-gold-500" />
                ))}
              </div>
              <p className="mt-4 max-w-xl text-lg italic text-brand-black/80">&ldquo;{t.comentario}&rdquo;</p>
              <p className="mt-4 font-semibold text-brand-black">{t.nombre}</p>
              <p className="text-sm text-brand-black/50">{t.ubicacion}</p>
            </motion.div>
          </AnimatePresence>

          <button
            type="button"
            onClick={prev}
            aria-label="Testimonio anterior"
            className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 rounded-full bg-white p-2 shadow-md hover:bg-brand-cream"
          >
            <ChevronLeft className="h-5 w-5 text-brand-black" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Siguiente testimonio"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 rounded-full bg-white p-2 shadow-md hover:bg-brand-cream"
          >
            <ChevronRight className="h-5 w-5 text-brand-black" />
          </button>
        </div>

        <div className="mt-6 flex justify-center gap-2">
          {testimonios.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Ir al testimonio ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-6 bg-brand-green-700" : "w-2 bg-black/15"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
