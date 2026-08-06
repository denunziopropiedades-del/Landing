"use client";

import { useActionState } from "react";
import { Download, Upload } from "lucide-react";
import { importarLotesExcelAction } from "@/lib/admin/actions";

export default function ImportarLotesForm({ proyectoId }: { proyectoId: string }) {
  const [state, formAction, pending] = useActionState(importarLotesExcelAction, null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Importar inventario desde Excel</h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Para loteos grandes, cargá todo el inventario de una vez con un archivo .xlsx con columnas: Manzana, Numero,
        Precio USD, Medidas (ej. &quot;10 x 30&quot;). Si un lote (misma manzana y número) ya existe, se actualiza el
        precio y las medidas sin tocar su estado (disponible/reservado/vendido).
      </p>

      <a
        href="/api/lotes/plantilla"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-brand-green-700 hover:underline"
      >
        <Download className="h-4 w-4" />
        Descargar plantilla de ejemplo
      </a>

      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input type="hidden" name="proyectoId" value={proyectoId} />
        <input
          type="file"
          name="archivo"
          accept=".xlsx"
          required
          className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm sm:max-w-xs"
        />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          <Upload className="h-4 w-4" />
          {pending ? "Importando..." : "Importar"}
        </button>
      </form>

      {state && !state.ok && <p className="mt-3 text-xs text-red-600">{state.error}</p>}
      {state && state.ok && (
        <p className="mt-3 text-xs text-brand-green-700">
          Se cargaron/actualizaron {state.creadosOActualizados} lotes.
          {state.filasConError > 0 && ` ${state.filasConError} filas se ignoraron por datos incompletos.`}
        </p>
      )}
    </div>
  );
}
