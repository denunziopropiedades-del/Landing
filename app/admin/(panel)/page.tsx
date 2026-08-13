import Link from "next/link";
import { ArrowRight, CalendarCheck2, MessagesSquare, PackageCheck, Users } from "lucide-react";
import { getLeads, getVisitas } from "@/lib/admin/data";
import { estadisticasDemo } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { EstadoLead } from "@/types/site";

const ESTADOS_FUNNEL: { estado: EstadoLead; label: string }[] = [
  { estado: "nuevo", label: "Nuevo" },
  { estado: "contactado", label: "Contactado" },
  { estado: "visita_programada", label: "Visita Programada" },
  { estado: "visita_realizada", label: "Visita realizada" },
  { estado: "reservado", label: "Reservado" },
  { estado: "pago_confirmado", label: "Pago confirmado" },
  { estado: "vendido", label: "Vendido" },
];

export default async function AdminDashboardPage() {
  const configurado = isSupabaseConfigured();
  const [leads, visitas] = await Promise.all([getLeads(), getVisitas()]);

  const reservas = leads.filter((l) => l.tipo === "reserva");
  const consultas = leads.filter((l) => l.tipo === "contacto");
  const nuevos = leads.filter((l) => l.estado === "nuevo").length;
  const descartados = leads.filter((l) => l.estado === "descartado").length;

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

  const totalFunnel = Math.max(leads.length - descartados, 1);
  const porProyecto = new Map<string, number>();
  leads.forEach((l) => {
    const nombre = l.proyectoNombre ?? "Sin proyecto";
    porProyecto.set(nombre, (porProyecto.get(nombre) ?? 0) + 1);
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-brand-black">Estadísticas</h1>
          <p className="mt-1 text-sm text-brand-black/60">Resumen general de la actividad del sitio.</p>
        </div>
        <Link href="/admin/reportes" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-green-700 hover:underline">
          Ver reportes
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

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
        <>
          <div className="mt-10 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Funnel de conversión</h2>
              <div className="space-y-3">
                {ESTADOS_FUNNEL.map((f) => {
                  const cantidad = leads.filter((l) => l.estado === f.estado).length;
                  const pct = Math.round((cantidad / totalFunnel) * 100);
                  return (
                    <div key={f.estado}>
                      <div className="mb-1 flex justify-between text-xs text-brand-black/60">
                        <span>{f.label}</span>
                        <span>{cantidad}</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-black/5">
                        <div className="h-full rounded-full bg-brand-green-600" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
              <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Leads por proyecto</h2>
              <div className="space-y-2">
                {Array.from(porProyecto.entries()).map(([nombre, cantidad]) => (
                  <div key={nombre} className="flex items-center justify-between border-b border-black/5 pb-2 text-sm last:border-0">
                    <span className="text-brand-black/70">{nombre}</span>
                    <span className="font-semibold text-brand-black">{cantidad}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
