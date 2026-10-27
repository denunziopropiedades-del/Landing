"use client";

import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

/** Link público para que el cliente cargue solo sus datos (matulotes.app/alta). */
export default function LinkAltaCliente() {
  const [copiado, setCopiado] = useState(false);
  const url = "https://matulotes.app/alta";
  const texto = `Hola! Para preparar tu documentación, completá tus datos acá: ${url}`;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      prompt("Copiá el link:", url);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-brand-black">Link para que el cliente cargue sus datos</p>
        <p className="truncate text-xs text-brand-black/50">{url} — cada envío crea un cliente nuevo en el CRM</p>
      </div>
      <button type="button" onClick={copiar} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/5">
        {copiado ? <Check className="h-3.5 w-3.5 text-brand-green-700" /> : <Copy className="h-3.5 w-3.5" />} {copiado ? "Copiado" : "Copiar link"}
      </button>
      <a
        href={`https://wa.me/?text=${encodeURIComponent(texto)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-green-600"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Enviar por WhatsApp
      </a>
    </div>
  );
}
