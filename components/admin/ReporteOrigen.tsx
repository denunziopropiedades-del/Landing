import { labelOrigen } from "@/lib/leads";
import type { Lead } from "@/types/site";

const VENTA = ["reservado", "pago_confirmado", "pendiente_firma_escribania", "firmado_escribania", "vendido"];

/** Qué canal trae consultas y cuál trae ventas. */
export default function ReporteOrigen({ leads }: { leads: Lead[] }) {
  const filas = new Map<string, { total: number; visitas: number; ventas: number }>();
  for (const l of leads) {
    const k = l.origen ?? "";
    const f = filas.get(k) ?? { total: 0, visitas: 0, ventas: 0 };
    f.total += 1;
    if (["visita_programada", "visita_realizada", ...VENTA].includes(l.estado)) f.visitas += 1;
    if (VENTA.includes(l.estado)) f.ventas += 1;
    filas.set(k, f);
  }
  const orden = [...filas.entries()].sort((a, b) => b[1].ventas - a[1].ventas || b[1].total - a[1].total);
  const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <div className="mt-8 rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
      <h2 className="font-display text-lg font-bold text-brand-black">¿De dónde vienen las ventas?</h2>
      <p className="mt-1 text-sm text-brand-black/60">
        Origen de cada cliente (Meta, Instagram, Google, preventa…). Los leads anteriores a esta función figuran como &quot;Sin dato&quot;; podés completarlo en
        la ficha del CRM.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase text-brand-black/50">
              <th className="py-2">Origen</th>
              <th className="py-2 text-right">Leads</th>
              <th className="py-2 text-right">Visitaron</th>
              <th className="py-2 text-right">Compraron / reservaron</th>
              <th className="py-2 text-right">Conversión</th>
            </tr>
          </thead>
          <tbody>
            {orden.map(([k, f]) => (
              <tr key={k || "sin"} className="border-b border-black/5">
                <td className="py-2 font-medium text-brand-black">{labelOrigen(k || null)}</td>
                <td className="py-2 text-right">{f.total}</td>
                <td className="py-2 text-right">{f.visitas}</td>
                <td className="py-2 text-right font-semibold">{f.ventas}</td>
                <td className="py-2 text-right">{pct(f.ventas, f.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
