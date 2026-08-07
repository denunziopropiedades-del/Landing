"use client";

import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Trash2 } from "lucide-react";
import {
  actualizarEstadoLeadAction,
  actualizarEstadoVisitaAction,
  cambiarProyectoVisitaAction,
  deleteLeadAction,
  eliminarVisitaAction,
} from "@/lib/admin/actions";
import type { EstadoLead, EstadoVisita, Lead, Proyecto, Visita } from "@/types/site";

const ESTADOS: EstadoLead[] = ["nuevo", "contactado", "visita_programada", "reservado", "vendido", "descartado"];
const ESTADOS_VISITA: EstadoVisita[] = ["pendiente", "confirmada", "cancelada", "realizada"];

type Campo = "nombre" | "fecha";
type Orden = { campo: Campo; direccion: "asc" | "desc" };

function IconoOrden({ activo, direccion }: { activo: boolean; direccion: "asc" | "desc" }) {
  if (!activo) return <ArrowUpDown className="inline h-3 w-3 text-brand-black/30" />;
  return direccion === "asc" ? (
    <ArrowUp className="inline h-3 w-3 text-brand-green-700" />
  ) : (
    <ArrowDown className="inline h-3 w-3 text-brand-green-700" />
  );
}

export default function ConsultasManager({
  leads,
  visitas,
  proyectos,
}: {
  leads: Lead[];
  visitas: Visita[];
  proyectos: Proyecto[];
}) {
  const [pending, startTransition] = useTransition();
  const [busqueda, setBusqueda] = useState("");
  const [ordenLeads, setOrdenLeads] = useState<Orden>({ campo: "fecha", direccion: "desc" });
  const [ordenVisitas, setOrdenVisitas] = useState<Orden>({ campo: "fecha", direccion: "desc" });

  const cambiarEstado = (id: string, estado: EstadoLead) => {
    startTransition(() => {
      actualizarEstadoLeadAction(id, estado);
    });
  };

  const cambiarEstadoVisita = (id: string, estado: EstadoVisita) => {
    startTransition(() => {
      actualizarEstadoVisitaAction(id, estado);
    });
  };

  const cambiarProyectoVisita = (id: string, proyectoId: string) => {
    startTransition(() => {
      cambiarProyectoVisitaAction(id, proyectoId || null);
    });
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta consulta?")) return;
    startTransition(() => {
      deleteLeadAction(id);
    });
  };

  const eliminarVisita = (id: string) => {
    if (!confirm("¿Eliminar esta visita agendada?")) return;
    startTransition(() => {
      eliminarVisitaAction(id);
    });
  };

  const toggleOrden = (setter: typeof setOrdenLeads, campo: Campo) => {
    setter((prev) =>
      prev.campo === campo ? { campo, direccion: prev.direccion === "asc" ? "desc" : "asc" } : { campo, direccion: "asc" }
    );
  };

  const texto = busqueda.trim().toLowerCase();

  const leadsFiltrados = useMemo(() => {
    let resultado = leads;
    if (texto) {
      resultado = resultado.filter((l) =>
        `${l.nombre} ${l.apellido ?? ""} ${l.email} ${l.telefono}`.toLowerCase().includes(texto)
      );
    }
    return [...resultado].sort((a, b) => {
      const valorA = ordenLeads.campo === "nombre" ? a.nombre.toLowerCase() : a.creadoEn;
      const valorB = ordenLeads.campo === "nombre" ? b.nombre.toLowerCase() : b.creadoEn;
      const comparacion = valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
      return ordenLeads.direccion === "asc" ? comparacion : -comparacion;
    });
  }, [leads, texto, ordenLeads]);

  const visitasFiltradas = useMemo(() => {
    let resultado = visitas;
    if (texto) {
      resultado = resultado.filter((v) => `${v.nombre} ${v.email} ${v.telefono}`.toLowerCase().includes(texto));
    }
    return [...resultado].sort((a, b) => {
      const valorA = ordenVisitas.campo === "nombre" ? a.nombre.toLowerCase() : a.fecha;
      const valorB = ordenVisitas.campo === "nombre" ? b.nombre.toLowerCase() : b.fecha;
      const comparacion = valorA < valorB ? -1 : valorA > valorB ? 1 : 0;
      return ordenVisitas.direccion === "asc" ? comparacion : -comparacion;
    });
  }, [visitas, texto, ordenVisitas]);

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-brand-black/60">{leadsFiltrados.length} consultas registradas</p>
        <div className="flex flex-1 items-center gap-3 sm:max-w-xs">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono..."
            className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none"
          />
        </div>
        <a
          href="/api/leads/exportar"
          className="inline-flex shrink-0 items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600"
        >
          <Download className="h-4 w-4" />
          Exportar a Excel
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleOrden(setOrdenLeads, "fecha")} className="inline-flex items-center gap-1">
                  Fecha <IconoOrden activo={ordenLeads.campo === "fecha"} direccion={ordenLeads.direccion} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">
                <button type="button" onClick={() => toggleOrden(setOrdenLeads, "nombre")} className="inline-flex items-center gap-1">
                  Nombre <IconoOrden activo={ordenLeads.campo === "nombre"} direccion={ordenLeads.direccion} />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Proyecto / Lote</th>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leadsFiltrados.map((l) => (
              <tr key={l.id} className="border-b border-black/5 last:border-0 align-top">
                <td className="whitespace-nowrap px-4 py-3">{new Date(l.creadoEn).toLocaleDateString("es-AR")}</td>
                <td className="px-4 py-3 capitalize">{l.tipo}</td>
                <td className="px-4 py-3">
                  {l.nombre} {l.apellido ?? ""}
                </td>
                <td className="px-4 py-3">
                  <p>{l.email}</p>
                  <p className="text-brand-black/50">{l.telefono}</p>
                </td>
                <td className="max-w-[220px] px-4 py-3 text-brand-black/70">
                  {l.proyectoNombre && <p>{l.proyectoNombre}</p>}
                  {l.loteNombre && <p className="text-xs text-brand-black/50">{l.loteNombre}</p>}
                  {l.mensaje && <p className="truncate text-xs">{l.mensaje}</p>}
                </td>
                <td className="px-4 py-3 text-brand-black/70">{l.asignadoNombre ?? "Sin asignar"}</td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={l.estado}
                    disabled={pending}
                    onChange={(e) => cambiarEstado(l.id, e.target.value as EstadoLead)}
                    className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                  >
                    {ESTADOS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" disabled={pending} onClick={() => eliminar(l.id)} className="text-red-600 hover:underline disabled:opacity-50">
                    <Trash2 className="inline h-4 w-4" /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
            {leadsFiltrados.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-brand-black/50">
                  {busqueda ? "No hay consultas que coincidan con la búsqueda." : "Todavía no hay consultas registradas."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Visitas agendadas</h2>
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="border-b border-black/10 text-brand-black/50">
              <tr>
                <th className="px-4 py-3 font-medium">
                  <button type="button" onClick={() => toggleOrden(setOrdenVisitas, "nombre")} className="inline-flex items-center gap-1">
                    Nombre <IconoOrden activo={ordenVisitas.campo === "nombre"} direccion={ordenVisitas.direccion} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Desarrollo</th>
                <th className="px-4 py-3 font-medium">
                  <button type="button" onClick={() => toggleOrden(setOrdenVisitas, "fecha")} className="inline-flex items-center gap-1">
                    Fecha <IconoOrden activo={ordenVisitas.campo === "fecha"} direccion={ordenVisitas.direccion} />
                  </button>
                </th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visitasFiltradas.map((v) => (
                <tr key={v.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">{v.nombre}</td>
                  <td className="px-4 py-3">
                    <p>{v.email}</p>
                    <p className="text-brand-black/50">{v.telefono}</p>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={v.proyectoId ?? ""}
                      disabled={pending}
                      onChange={(e) => cambiarProyectoVisita(v.id, e.target.value)}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                    >
                      <option value="">Sin desarrollo</option>
                      {proyectos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">{v.fecha}</td>
                  <td className="px-4 py-3">{v.horario}</td>
                  <td className="px-4 py-3">
                    <select
                      defaultValue={v.estado}
                      disabled={pending}
                      onChange={(e) => cambiarEstadoVisita(v.id, e.target.value as EstadoVisita)}
                      className="rounded-lg border border-black/10 px-2 py-1 text-xs"
                    >
                      {ESTADOS_VISITA.map((e) => (
                        <option key={e} value={e}>
                          {e}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" disabled={pending} onClick={() => eliminarVisita(v.id)} className="text-red-600 hover:underline disabled:opacity-50">
                      <Trash2 className="inline h-4 w-4" /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {visitasFiltradas.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-brand-black/50">
                    {busqueda ? "No hay visitas que coincidan con la búsqueda." : "Todavía no hay visitas agendadas."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
