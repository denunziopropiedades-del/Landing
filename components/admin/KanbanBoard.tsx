"use client";

import { useMemo, useState, useTransition } from "react";
import { GripVertical, Mail, Phone } from "lucide-react";
import {
  actualizarEstadoLeadAction,
  actualizarFechaNacimientoLeadAction,
  actualizarObservacionesLeadAction,
  asignarLeadAction,
  cambiarProyectoLeadAction,
} from "@/lib/admin/actions";
import type { EstadoLead, Lead, Perfil, Proyecto, Rol } from "@/types/site";

const COLUMNAS: { estado: EstadoLead; label: string; color: string }[] = [
  { estado: "nuevo", label: "Nuevo", color: "border-t-blue-500" },
  { estado: "contactado", label: "Contactado", color: "border-t-purple-500" },
  { estado: "visita_programada", label: "Visita Programada", color: "border-t-amber-500" },
  { estado: "reservado", label: "Reservado", color: "border-t-yellow-500" },
  { estado: "vendido", label: "Vendido", color: "border-t-green-600" },
  { estado: "descartado", label: "Descartado", color: "border-t-red-500" },
];

function LeadCard({
  lead,
  vendedores,
  proyectos,
  puedeAsignar,
  onMoved,
}: {
  lead: Lead;
  vendedores: Perfil[];
  proyectos: Proyecto[];
  puedeAsignar: boolean;
  onMoved: () => void;
}) {
  const [observaciones, setObservaciones] = useState(lead.observaciones);
  const [, startTransition] = useTransition();

  const guardarObservaciones = () => {
    if (observaciones === lead.observaciones) return;
    startTransition(() => {
      actualizarObservacionesLeadAction(lead.id, observaciones);
    });
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", lead.id);
      }}
      onDragEnd={onMoved}
      className="cursor-grab rounded-xl border border-black/5 bg-white p-3 shadow-sm active:cursor-grabbing"
    >
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-brand-black">
          {lead.nombre} {lead.apellido ?? ""}
        </p>
        <GripVertical className="h-4 w-4 shrink-0 text-brand-black/25" />
      </div>
      {puedeAsignar ? (
        <select
          defaultValue={lead.proyectoId ?? ""}
          onChange={(e) =>
            startTransition(() => {
              cambiarProyectoLeadAction(lead.id, e.target.value || null);
            })
          }
          className="mt-1 w-full rounded-lg border border-black/10 px-2 py-1 text-xs text-brand-black/70"
        >
          <option value="">Sin desarrollo</option>
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre}
            </option>
          ))}
        </select>
      ) : (
        lead.proyectoNombre && <p className="text-xs text-brand-black/50">{lead.proyectoNombre}</p>
      )}
      {lead.loteNombre && <p className="text-xs text-brand-black/50">{lead.loteNombre}</p>}
      <div className="mt-2 space-y-1 text-xs text-brand-black/60">
        <p className="flex items-center gap-1.5">
          <Mail className="h-3 w-3" /> {lead.email}
        </p>
        <p className="flex items-center gap-1.5">
          <Phone className="h-3 w-3" /> {lead.telefono}
        </p>
      </div>

      {puedeAsignar && (
        <select
          defaultValue={lead.asignadoA ?? ""}
          onChange={(e) =>
            startTransition(() => {
              asignarLeadAction(lead.id, e.target.value || null);
            })
          }
          className="mt-2 w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
        >
          <option value="">Sin asignar</option>
          {vendedores.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre ?? v.email}
            </option>
          ))}
        </select>
      )}

      {lead.estado === "vendido" && (
        <div className="mt-2">
          <label className="mb-1 block text-[11px] font-medium text-brand-black/50">
            Fecha de nacimiento (para el saludo de cumpleaños)
          </label>
          <input
            type="date"
            defaultValue={lead.fechaNacimiento ?? ""}
            onChange={(e) =>
              startTransition(() => {
                actualizarFechaNacimientoLeadAction(lead.id, e.target.value || null);
              })
            }
            className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
          />
        </div>
      )}

      <textarea
        value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)}
        onBlur={guardarObservaciones}
        placeholder="Observaciones..."
        rows={2}
        className="mt-2 w-full rounded-lg border border-black/10 px-2 py-1 text-xs focus:border-brand-green-600 focus:outline-none"
      />
    </div>
  );
}

export default function KanbanBoard({
  leads: leadsIniciales,
  vendedores,
  proyectos,
  rolActual,
}: {
  leads: Lead[];
  vendedores: Perfil[];
  proyectos: Proyecto[];
  rolActual: Rol;
}) {
  const [leads, setLeads] = useState(leadsIniciales);
  const [dragOver, setDragOver] = useState<EstadoLead | null>(null);
  const puedeAsignar = rolActual === "administrador" || rolActual === "supervisor";

  const columnas = useMemo(
    () => COLUMNAS.map((col) => ({ ...col, leads: leads.filter((l) => l.estado === col.estado) })),
    [leads]
  );

  const mover = (id: string, estado: EstadoLead) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
    actualizarEstadoLeadAction(id, estado);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columnas.map((col) => (
        <div
          key={col.estado}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(col.estado);
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData("text/plain");
            if (id) mover(id, col.estado);
            setDragOver(null);
          }}
          className={`flex w-72 shrink-0 flex-col rounded-2xl border-t-4 bg-brand-cream/60 p-3 ${col.color} ${
            dragOver === col.estado ? "ring-2 ring-brand-green-500" : ""
          }`}
        >
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-sm font-bold text-brand-black">{col.label}</h3>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-semibold text-brand-black/60">
              {col.leads.length}
            </span>
          </div>
          <div className="flex-1 space-y-2">
            {col.leads.map((lead) => (
              <LeadCard
                key={lead.id}
                lead={lead}
                vendedores={vendedores}
                proyectos={proyectos}
                puedeAsignar={puedeAsignar}
                onMoved={() => setDragOver(null)}
              />
            ))}
            {col.leads.length === 0 && <p className="px-1 py-6 text-center text-xs text-brand-black/30">Sin leads</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
