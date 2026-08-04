import { Download } from "lucide-react";
import { getProyectosAdmin } from "@/lib/admin/data";

const ESTADOS = ["nuevo", "contactado", "visita_programada", "reservado", "vendido", "descartado"];

export default async function AdminReportesPage() {
  const proyectos = await getProyectosAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Reportes</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Exportá leads y visitas a Excel, filtrando por proyecto, estado o rango de fechas.
      </p>

      <form
        action="/api/leads/exportar"
        method="get"
        target="_blank"
        className="mt-8 grid gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-black/70">Proyecto</label>
          <select name="proyecto" defaultValue="" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="">Todos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-black/70">Estado</label>
          <select name="estado" defaultValue="" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm">
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-black/70">Desde</label>
          <input type="date" name="desde" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-brand-black/70">Hasta</label>
          <input type="date" name="hasta" className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" />
        </div>
        <div className="sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-600"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </button>
        </div>
      </form>
    </div>
  );
}
