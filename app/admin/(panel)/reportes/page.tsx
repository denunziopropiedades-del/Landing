import { Download, FileText } from "lucide-react";
import { getLeads, getProyectosAdmin } from "@/lib/admin/data";
import ReportesCharts from "@/components/admin/ReportesCharts";

const ESTADOS = ["nuevo", "contactado", "visita_programada", "reservado", "vendido", "descartado"];

export default async function AdminReportesPage() {
  const [proyectos, leads] = await Promise.all([getProyectosAdmin(), getLeads()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Reportes</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Gráficos en vivo del pipeline de leads, y exportación a Excel o PDF filtrando por proyecto, estado o rango de
        fechas.
      </p>

      <div className="mt-8">
        <ReportesCharts leads={leads} proyectos={proyectos} />
      </div>

      <form
        action="/api/leads/exportar"
        method="get"
        target="_blank"
        className="mt-8 grid gap-4 rounded-2xl border border-black/5 bg-white p-6 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
      >
        <h2 className="font-display text-lg font-bold text-brand-black sm:col-span-2 lg:col-span-4">
          Exportar reporte
        </h2>
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
        <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-green-600"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </button>
          <button
            type="submit"
            formAction="/api/leads/exportar-pdf"
            className="inline-flex items-center gap-2 rounded-full bg-brand-black px-6 py-3 text-sm font-semibold text-white hover:bg-brand-black/85"
          >
            <FileText className="h-4 w-4" />
            Exportar a PDF
          </button>
        </div>
      </form>
    </div>
  );
}
