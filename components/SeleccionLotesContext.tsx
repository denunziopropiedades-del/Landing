"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const MAX_LOTES = 3;

type SeleccionLotesContextValue = {
  seleccionados: string[];
  toggleSeleccion: (loteId: string) => void;
  limiteAlcanzado: boolean;
};

const SeleccionLotesContext = createContext<SeleccionLotesContextValue | null>(null);

const FALLBACK: SeleccionLotesContextValue = {
  seleccionados: [],
  toggleSeleccion: () => {},
  limiteAlcanzado: false,
};

/** Comparte, entre el plano interactivo y el formulario de reserva, los lotes que el cliente
 * fue eligiendo para reservar en una misma operación (hasta 3). */
export function SeleccionLotesProvider({ children }: { children: ReactNode }) {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);

  const toggleSeleccion = (loteId: string) => {
    setSeleccionados((prev) => {
      if (prev.includes(loteId)) return prev.filter((id) => id !== loteId);
      if (prev.length >= MAX_LOTES) return prev;
      return [...prev, loteId];
    });
  };

  return (
    <SeleccionLotesContext.Provider
      value={{ seleccionados, toggleSeleccion, limiteAlcanzado: seleccionados.length >= MAX_LOTES }}
    >
      {children}
    </SeleccionLotesContext.Provider>
  );
}

export function useSeleccionLotes() {
  return useContext(SeleccionLotesContext) ?? FALLBACK;
}
