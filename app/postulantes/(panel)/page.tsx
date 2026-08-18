import Link from "next/link";
import { CalendarClock, CheckCircle2, ClipboardList, MessagesSquare, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import { getIndicadores } from "@/lib/candidatos/data";
import { CARGO_LABEL } from "@/lib/candidatos/constants";
import { formatPesosDiarios } from "@/lib/candidatos/format";
import GraficoPorCargo from "@/components/candidatos/GraficoPorCargo";

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <Icon className={accent ? "h-4 w-4 text-obra-orange-500" : "h-4 w-4 text-slate-400"} />
      </div>
      <p className="mt-2 text-2xl font-bold text-obra-slate-950">{value}</p>
    </div>
  );
}

export default async function DashboardPostulantesPage() {
  const ind = await getIndicadores();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-obra-slate-950">Dashboard</h1>
          <p className="text-sm text-slate-500">Estado general de la base de candidatos.</p>
        </div>
        <Link
          href="/postulantes/candidatos/nuevo"
          className="rounded-full bg-obra-orange-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-obra-orange-400"
        >
          + Cargar candidato
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total de candidatos" value={ind.total} accent />
        {Object.entries(ind.porCargo).map(([cargo, cantidad]) => (
          <StatCard key={cargo} icon={ClipboardList} label={CARGO_LABEL[cargo as keyof typeof CARGO_LABEL]} value={cantidad} />
        ))}
        <StatCard icon={CalendarClock} label="Disponibilidad inmediata" value={ind.disponibilidadInmediata} />
        <StatCard icon={MessagesSquare} label="Preseleccionados" value={ind.preseleccionados} />
        <StatCard icon={ClipboardList} label="En entrevista" value={ind.enEntrevista} />
        <StatCard icon={CheckCircle2} label="Contratados" value={ind.contratados} accent />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wallet} label="Pretensión promedio diaria" value={formatPesosDiarios(ind.pretensionPromedio)} />
        <StatCard icon={TrendingDown} label="Pretensión mínima diaria" value={formatPesosDiarios(ind.pretensionMinima)} />
        <StatCard icon={TrendingUp} label="Pretensión máxima diaria" value={formatPesosDiarios(ind.pretensionMaxima)} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 text-sm font-semibold text-obra-slate-950">Candidatos por cargo</p>
        {ind.total > 0 ? (
          <GraficoPorCargo porCargo={ind.porCargo} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">Todavía no hay candidatos cargados.</p>
        )}
      </div>
    </div>
  );
}
