"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EstadoLead, Lead, Proyecto } from "@/types/site";

function formatoInput(fecha: Date) {
  return fecha.toISOString().slice(0, 10);
}

function hace7Dias() {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() - 7);
  return formatoInput(fecha);
}

const ESTADO_LABEL: Record<EstadoLead, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita_programada: "Visita Programada",
  reservado: "Reservado",
  pendiente_firma_escribania: "Pend. firma escribanía",
  firmado_escribania: "Firmado escribanía",
  vendido: "Vendido",
  descartado: "Descartado",
};

const ESTADO_COLOR: Record<EstadoLead, string> = {
  nuevo: "#3b82f6",
  contactado: "#a855f7",
  visita_programada: "#f59e0b",
  pendiente_firma_escribania: "#fb923c",
  firmado_escribania: "#14b8a6",
  reservado: "#eab308",
  vendido: "#16a34a",
  descartado: "#ef4444",
};

const COLORES_PROYECTO = ["#154a2e", "#237046", "#d4af37", "#96741f", "#0a2318", "#eed49a"];

export default function ReportesCharts({ leads, proyectos }: { leads: Lead[]; proyectos: Proyecto[] }) {
  const [desdeInput, setDesdeInput] = useState(hace7Dias());
  const [hastaInput, setHastaInput] = useState(formatoInput(new Date()));
  const [desde, setDesde] = useState(desdeInput);
  const [hasta, setHasta] = useState(hastaInput);

  const leadsFiltrados = useMemo(() => {
    const desdeMs = new Date(`${desde}T00:00:00`).getTime();
    const hastaMs = new Date(`${hasta}T23:59:59.999`).getTime();
    return leads.filter((l) => {
      const creado = new Date(l.creadoEn).getTime();
      return creado >= desdeMs && creado <= hastaMs;
    });
  }, [leads, desde, hasta]);

  const porEstado = useMemo(
    () =>
      (Object.keys(ESTADO_LABEL) as EstadoLead[]).map((estado) => ({
        estado: ESTADO_LABEL[estado],
        cantidad: leadsFiltrados.filter((l) => l.estado === estado).length,
        color: ESTADO_COLOR[estado],
      })),
    [leadsFiltrados]
  );

  const porProyecto = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const lead of leadsFiltrados) {
      const nombre = lead.proyectoNombre ?? "Sin proyecto";
      mapa.set(nombre, (mapa.get(nombre) ?? 0) + 1);
    }
    return Array.from(mapa.entries()).map(([nombre, cantidad]) => ({ nombre, cantidad }));
  }, [leadsFiltrados]);

  const enElTiempo = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const lead of leadsFiltrados) {
      const fecha = new Date(lead.creadoEn).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
      mapa.set(fecha, (mapa.get(fecha) ?? 0) + 1);
    }
    return Array.from(mapa.entries()).map(([fecha, cantidad]) => ({ fecha, cantidad }));
  }, [leadsFiltrados]);

  const filtroForm = (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setDesde(desdeInput);
        setHasta(hastaInput);
      }}
      className="mb-6 flex flex-wrap items-end gap-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm"
    >
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-black/70">Desde</label>
        <input
          type="date"
          value={desdeInput}
          onChange={(e) => setDesdeInput(e.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-brand-black/70">Hasta</label>
        <input
          type="date"
          value={hastaInput}
          onChange={(e) => setHastaInput(e.target.value)}
          className="rounded-lg border border-black/10 px-3 py-2 text-sm"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600"
      >
        <Search className="h-4 w-4" />
        Buscar
      </button>
    </form>
  );

  if (leadsFiltrados.length === 0) {
    return (
      <div>
        {filtroForm}
        <div className="rounded-2xl border border-black/5 bg-white p-8 text-center text-sm text-brand-black/50 shadow-sm">
          No hay leads en ese rango de fechas para graficar.
        </div>
      </div>
    );
  }

  return (
    <div>
      {filtroForm}
      <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-bold text-brand-black">Leads por estado</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={porEstado} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="estado" width={110} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="cantidad" radius={[0, 6, 6, 0]}>
              {porEstado.map((entry) => (
                <Cell key={entry.estado} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-display text-lg font-bold text-brand-black">Leads por proyecto</h3>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={porProyecto} dataKey="cantidad" nameKey="nombre" innerRadius={55} outerRadius={95} paddingAngle={2}>
              {porProyecto.map((entry, i) => (
                <Cell key={entry.nombre} fill={COLORES_PROYECTO[i % COLORES_PROYECTO.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        {proyectos.length === 0 && (
          <p className="mt-2 text-xs text-brand-black/40">Todavía no hay proyectos cargados.</p>
        )}
      </div>

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm lg:col-span-2">
        <h3 className="mb-4 font-display text-lg font-bold text-brand-black">Leads en el tiempo</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={enElTiempo}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="fecha" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="cantidad" stroke="#237046" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
