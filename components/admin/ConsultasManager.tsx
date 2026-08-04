"use client";

import { useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { actualizarEstadoLeadAction, actualizarEstadoVisitaAction, deleteLeadAction } from "@/lib/admin/actions";
import type { EstadoLead, EstadoVisita, Lead, Visita } from "@/types/site";

const ESTADOS: EstadoLead[] = ["nuevo", "contactado", "visita_programada", "reservado", "vendido", "descartado"];
const ESTADOS_VISITA: EstadoVisita[] = ["pendiente", "confirmada", "cancelada", "realizada"];

export default function ConsultasManager({ leads, visitas }: { leads: Lead[]; visitas: Visita[] }) {
  const [pending, startTransition] = useTransition();

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

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar esta consulta?")) return;
    startTransition(() => {
      deleteLeadAction(id);
    });
  };

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <p className="text-sm text-brand-black/60">{leads.length} consultas registradas</p>
        <a
          href="/api/leads/exportar"
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600"
        >
          <Download className="h-4 w-4" />
          Exportar a Excel
        </a>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Tipo</th>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Contacto</th>
              <th className="px-4 py-3 font-medium">Proyecto / Lote</th>
              <th className="px-4 py-3 font-medium">Vendedor</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((l) => (
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
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-brand-black/50">
                  Todavía no hay consultas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Visitas agendadas</h2>
        <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-black/10 text-brand-black/50">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {visitas.map((v) => (
                <tr key={v.id} className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">{v.nombre}</td>
                  <td className="px-4 py-3">
                    <p>{v.email}</p>
                    <p className="text-brand-black/50">{v.telefono}</p>
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
                </tr>
              ))}
              {visitas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-brand-black/50">
                    Todavía no hay visitas agendadas.
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
