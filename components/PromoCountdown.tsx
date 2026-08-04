"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import type { Promocion } from "@/types/site";

function getRemaining(fechaFin: string) {
  const total = Math.max(0, new Date(fechaFin).getTime() - Date.now());
  return {
    total,
    dias: Math.floor(total / (1000 * 60 * 60 * 24)),
    horas: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutos: Math.floor((total / (1000 * 60)) % 60),
    segundos: Math.floor((total / 1000) % 60),
  };
}

export default function PromoCountdown({ promo }: { promo: Promocion }) {
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(promo.fechaFin));
    const interval = setInterval(tick, 1000);
    const initial = setTimeout(tick, 0);
    return () => {
      clearInterval(interval);
      clearTimeout(initial);
    };
  }, [promo.fechaFin]);

  if (!promo.activa || !remaining || remaining.total <= 0) return null;

  const unidades = [
    { label: "Días", value: remaining.dias },
    { label: "Hs", value: remaining.horas },
    { label: "Min", value: remaining.minutos },
    { label: "Seg", value: remaining.segundos },
  ];

  return (
    <div className="bg-gradient-to-r from-red-700 via-red-600 to-amber-500 py-4 text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-3">
          <Flame className="h-7 w-7 shrink-0 text-yellow-200" />
          <div>
            <p className="text-lg font-extrabold uppercase tracking-wide sm:text-xl">{promo.titulo}</p>
            <p className="text-sm text-white/90">{promo.bajada}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {unidades.map((u) => (
            <div key={u.label} className="flex w-14 flex-col items-center rounded-lg bg-black/25 py-2 sm:w-16">
              <span className="text-xl font-bold tabular-nums sm:text-2xl">{String(u.value).padStart(2, "0")}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/80">{u.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
