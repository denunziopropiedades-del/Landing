"use client";

import { useState } from "react";

/** Compara la huella SHA-256 de un PDF elegido por el usuario con la registrada (el archivo no sale del navegador). */
export default function VerificarArchivo({ hash }: { hash: string }) {
  const [resultado, setResultado] = useState<null | "ok" | "distinto">(null);
  const [calculando, setCalculando] = useState(false);

  const revisar = async (archivo: File | undefined) => {
    if (!archivo) return;
    setCalculando(true);
    try {
      const buf = await archivo.arrayBuffer();
      const dig = await crypto.subtle.digest("SHA-256", buf);
      const hex = Array.from(new Uint8Array(dig))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      setResultado(hex === hash ? "ok" : "distinto");
    } finally {
      setCalculando(false);
    }
  };

  return (
    <div className="mt-3">
      <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 p-4 text-center text-sm text-slate-600 hover:border-slate-400">
        {calculando ? "Revisando…" : "Elegí el PDF que te entregaron para compararlo"}
        <input type="file" accept="application/pdf" className="hidden" onChange={(e) => revisar(e.target.files?.[0])} />
      </label>
      {resultado === "ok" && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
          ✓ El archivo es idéntico al documento emitido.
        </p>
      )}
      {resultado === "distinto" && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          ✗ El archivo NO coincide con el documento emitido: pudo haber sido modificado.
        </p>
      )}
      <p className="mt-1 text-[11px] text-slate-400">El archivo se revisa en tu dispositivo: no se sube a ningún lado.</p>
    </div>
  );
}
