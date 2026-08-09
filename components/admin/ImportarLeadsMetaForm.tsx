"use client";

import { useActionState } from "react";
import { Upload } from "lucide-react";
import { importarLeadsMetaCsvAction } from "@/lib/admin/actions";
import type { Proyecto } from "@/types/site";

export default function ImportarLeadsMetaForm({ proyectos }: { proyectos: Proyecto[] }) {
  const [state, formAction, pending] = useActionState(importarLeadsMetaCsvAction, null);

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Importar leads de Meta Ads (CSV)</h2>
      <p className="mb-4 text-sm text-brand-black/60">
        Si un lead de Facebook/Instagram no llegó solo al CRM, subí acá el CSV que descargás desde el Administrador de
        anuncios de Meta (Herramientas de publicación → Biblioteca de clientes potenciales → Descargar). Los leads que
        ya estén cargados no se duplican.
      </p>

      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {proyectos.length > 0 && (
          <select
            name="proyectoId"
            defaultValue={proyectos[0]?.id ?? ""}
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm sm:max-w-[220px]"
          >
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        )}
        <input
          type="file"
          name="archivo"
          accept=".csv"
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
          Se importaron {state.creados} leads nuevos.
          {state.duplicados > 0 && ` ${state.duplicados} ya estaban cargados.`}
          {state.filasConError > 0 && ` ${state.filasConError} filas se ignoraron por datos incompletos.`}
        </p>
      )}
    </div>
  );
}
