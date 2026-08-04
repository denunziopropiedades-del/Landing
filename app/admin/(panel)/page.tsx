import { CalendarCheck2, MessagesSquare, PackageCheck, Users } from "lucide-react";
import { getLeads, getVisitas } from "@/lib/admin/data";
import { estadisticasDemo } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function AdminDashboardPage() {
  const configurado = isSupabaseConfigured();
  const [leads, visitas] = await Promise.all([getLeads(), getVisitas()]);

  const reservas = leads.filter((l) => l.tipo === "reserva");
  const consultas = leads.filter((l) => l.tipo === "contacto");
  const nuevos = leads.filter((l) => l.estado === "nuevo").length;

  const stats = configurado
    ? [
        { label: "Reservas totales", value: reservas.length, icon: PackageCheck },
        { label: "Consultas de contacto", value: consultas.length, icon: MessagesSquare },
        { label: "Visitas agendadas", value: visitas.length, icon: CalendarCheck2 },
        { label: "Leads sin contactar", value: nuevos, icon: Users },
      ]
    : [
        { label: "Visitas últimos 30 días (demo)", value: estadisticasDemo.visitasUltimos30Dias, icon: Users },
        { label: "Consultas por WhatsApp (demo)", value: estadisticasDemo.consultasWhatsapp, icon: MessagesSquare },
        { label: "Reservas activas (demo)", value: estadisticasDemo.reservasActivas, icon: PackageCheck },
        { label: "Lote más consultado (demo)", value: estadisticasDemo.loteMasConsultado, icon: CalendarCheck2 },
      ];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Estadísticas</h1>
      <p className="mt-1 text-sm text-brand-black/60">Resumen general de la actividad del sitio.</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <s.icon className="h-6 w-6 text-brand-green-700" />
            <p className="mt-4 text-2xl font-bold text-brand-black">{s.value}</p>
            <p className="mt-1 text-sm text-brand-black/60">{s.label}</p>
          </div>
        ))}
      </div>

      {!configurado && (
        <p className="mt-8 max-w-xl text-sm text-brand-black/50">
          Estos valores son de demostración. Configurá Supabase para ver estadísticas reales basadas en tus leads y
          visitas.
        </p>
      )}

      {configurado && leads.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Últimas consultas</h2>
          <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
            <table className="w-full min-w-[500px] text-left text-sm">
              <thead className="border-b border-black/10 text-brand-black/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                </tr>
              </thead>
              <tbody>
                {leads.slice(0, 8).map((l) => (
                  <tr key={l.id} className="border-b border-black/5 last:border-0">
                    <td className="px-4 py-3">{new Date(l.creadoEn).toLocaleDateString("es-AR")}</td>
                    <td className="px-4 py-3 capitalize">{l.tipo}</td>
                    <td className="px-4 py-3">
                      {l.nombre} {l.apellido ?? ""}
                    </td>
                    <td className="px-4 py-3 capitalize">{l.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
