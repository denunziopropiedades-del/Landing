"use client";

import { useActionState } from "react";
import { Download, Upload } from "lucide-react";
import { actualizarEstadosLotesAction } from "@/lib/admin/actions";

export default function ActualizarEstadosLotesForm({ proyectoId }: { proyectoId: string }) {
  const [state, formAction, pending] = useActionState(actualizarEstadosLotesAction, null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Actualizar estados y posición desde Excel</h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Subí un .xlsx con columnas: <b>Manzana</b>, <b>Numero</b>, <b>Estado</b> (disponible, reservado, vendido o
        no_disponible), y opcionalmente <b>PosX</b>/<b>PosY</b> (0 a 100, posición del punto en el plano
        interactivo). Solo actualiza los lotes que ya existen — no toca precio ni medidas.
      </p>

      <a
        href="/api/lotes/plantilla-estados"
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
          {pending ? "Actualizando..." : "Actualizar estados"}
        </button>
      </form>

      {state && !state.ok && <p className="mt-3 text-xs text-red-600">{state.error}</p>}
      {state && state.ok && (
        <p className="mt-3 text-xs text-brand-green-700">
          Se actualizaron {state.creadosOActualizados} lotes.
          {state.filasConError > 0 && ` ${state.filasConError} filas se ignoraron (lote inexistente o estado inválido).`}
        </p>
      )}
    </div>
  );
}
