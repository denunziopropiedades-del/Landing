"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ItemGaleria } from "@/types/site";

const TABS: { key: ItemGaleria["categoria"]; label: string }[] = [
  { key: "fotos", label: "Fotos" },
  { key: "videos", label: "Videos" },
  { key: "drone", label: "Drone" },
  { key: "plano", label: "Plano del barrio" },
  { key: "masterplan", label: "Masterplan" },
];

export default function Galeria({ items }: { items: ItemGaleria[] }) {
  const [tab, setTab] = useState<ItemGaleria["categoria"]>("fotos");
  const [lightbox, setLightbox] = useState<ItemGaleria | null>(null);

  const filtrados = items.filter((i) => i.categoria === tab);

  return (
    <section className="bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Galería</h2>
          <p className="mt-3 text-brand-black/70">Fotos, videos, tomas de drone, plano del barrio y masterplan.</p>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded-full px-5 py-2 text-sm font-medium transition",
                tab === t.key
                  ? "bg-brand-green-700 text-white"
                  : "bg-white text-brand-black/70 hover:bg-brand-green-700/10"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((item) =>
            item.categoria === "videos" ? (
              <div key={item.id} className="overflow-hidden rounded-2xl border border-black/5 shadow-sm">
                <div className="aspect-video">
                  <iframe
                    className="h-full w-full"
                    src={item.url}
                    title={item.titulo}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
                <p className="p-3 text-sm font-medium text-brand-black/80">{item.titulo}</p>
              </div>
            ) : (
              <button
                key={item.id}
                type="button"
                onClick={() => setLightbox(item)}
                className="group relative aspect-video overflow-hidden rounded-2xl border border-black/5 shadow-sm"
              >
                <Image
                  src={item.url}
                  alt={item.titulo}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-sm font-medium text-white">
                  {item.titulo}
                </span>
              </button>
            )
          )}
          {filtrados.length === 0 && (
            <p className="col-span-full py-10 text-center text-brand-black/50">Próximamente contenido en esta categoría.</p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightbox(null)}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Cerrar"
              className="absolute right-5 top-5 text-white/80 hover:text-white"
            >
              <X className="h-8 w-8" />
            </button>
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative h-[70vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image src={lightbox.url} alt={lightbox.titulo} fill sizes="100vw" className="object-contain" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
