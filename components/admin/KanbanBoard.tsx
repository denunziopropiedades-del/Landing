"use client";

import { useMemo, useState, useTransition } from "react";
import { ChevronDown, ChevronUp, GripVertical, Mail, Phone, Trash2 } from "lucide-react";
import {
  actualizarComisionHonorariosLeadAction,
  actualizarEstadoLeadAction,
  actualizarFechaNacimientoLeadAction,
  actualizarFirmaEscribaniaLeadAction,
  actualizarObservacionesLeadAction,
  actualizarPagoLeadAction,
  actualizarSexoLeadAction,
  asignarLeadAction,
  cambiarProyectoLeadAction,
  deleteLeadAction,
} from "@/lib/admin/actions";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";
import type { EstadoLead, Lead, Perfil, Proyecto, Rol } from "@/types/site";

const COLUMNAS: { estado: EstadoLead; label: string; color: string }[] = [
  { estado: "nuevo", label: "Nuevo", color: "border-t-blue-500" },
  { estado: "contactado", label: "Contactado", color: "border-t-purple-500" },
  { estado: "visita_programada", label: "Visita Programada", color: "border-t-amber-500" },
  { estado: "visita_realizada", label: "Visita realizada / Seguimiento", color: "border-t-sky-500" },
  { estado: "reservado", label: "Reservado", color: "border-t-yellow-500" },
  { estado: "pago_confirmado", label: "Pago confirmado", color: "border-t-cyan-500" },
  { estado: "pendiente_firma_escribania", label: "Pendiente firma escribanía", color: "border-t-orange-500" },
  { estado: "firmado_escribania", label: "Firmado escribanía", color: "border-t-teal-500" },
  { estado: "vendido", label: "Vendido", color: "border-t-green-600" },
  { estado: "descartado", label: "Descartado", color: "border-t-red-500" },
];


function LeadCard({
  lead,
  vendedores,
  proyectos,
  puedeAsignar,
  puedeBorrar,
  onMoved,
  onActualizado,
}: {
  lead: Lead;
  vendedores: Perfil[];
  proyectos: Proyecto[];
  puedeAsignar: boolean;
  puedeBorrar: boolean;
  onMoved: () => void;
  onActualizado: (id: string, patch: Partial<Lead>) => void;
}) {
  const [observaciones, setObservaciones] = useState(lead.observaciones);
  const [numeroTransaccion, setNumeroTransaccion] = useState(lead.numeroTransaccion ?? "");
  const [importeCobrado, setImporteCobrado] = useState(lead.importeCobrado?.toString() ?? "");
  const [fechaFirma, setFechaFirma] = useState(lead.fechaFirmaEscribania ?? "");
  const [horarioFirma, setHorarioFirma] = useState(lead.horarioFirmaEscribania ?? "");
  const [comisionUsd, setComisionUsd] = useState(lead.comisionUsd?.toString() ?? "");
  const [honorariosUsd, setHonorariosUsd] = useState(lead.honorariosUsd?.toString() ?? "");
  const [honorariosArs, setHonorariosArs] = useState(lead.honorariosArs?.toString() ?? "");
  const [gastosArs, setGastosArs] = useState(lead.gastosArs?.toString() ?? "");
  const [expandido, setExpandido] = useState(false);
  const [, startTransition] = useTransition();

  // Todas las acciones de guardado "onBlur" avisan si falla (antes fallaban en
  // silencio: el campo parecía guardado pero, al no persistir, volvía a verse
  // vacío en la próxima carga de la página). Si funcionan, avisan al tablero
  // (onActualizado) para que la tarjeta no "vuelva atrás" al cambiar de columna
  // (antes solo se actualizaba el estado local de este componente, y al mover
  // el lead a otra columna se remonta desde el dato viejo que tenía el tablero).
  const guardarObservaciones = () => {
    if (observaciones === lead.observaciones) return;
    startTransition(() => {
      actualizarObservacionesLeadAction(lead.id, observaciones).then((res) => {
        if (!res.ok) alert(`No se pudo guardar la observación: ${res.error}`);
        else onActualizado(lead.id, { observaciones });
      });
    });
  };

  const guardarPago = () => {
    if (numeroTransaccion === (lead.numeroTransaccion ?? "") && importeCobrado === (lead.importeCobrado?.toString() ?? ""))
      return;
    startTransition(() => {
      actualizarPagoLeadAction(lead.id, numeroTransaccion, importeCobrado).then((res) => {
        if (!res.ok) alert(`No se pudo guardar el pago: ${res.error}`);
        else
          onActualizado(lead.id, {
            numeroTransaccion: numeroTransaccion || null,
            importeCobrado: importeCobrado ? Number(importeCobrado) : null,
          });
      });
    });
  };

  const guardarFirma = () => {
    if (fechaFirma === (lead.fechaFirmaEscribania ?? "") && horarioFirma === (lead.horarioFirmaEscribania ?? "")) return;
    startTransition(() => {
      actualizarFirmaEscribaniaLeadAction(lead.id, fechaFirma, horarioFirma).then((res) => {
        if (!res.ok) alert(`No se pudo guardar la fecha/horario de firma: ${res.error}`);
        else
          onActualizado(lead.id, {
            fechaFirmaEscribania: fechaFirma || null,
            horarioFirmaEscribania: horarioFirma || null,
          });
      });
    });
  };

  const guardarComisionHonorarios = () => {
    if (
      comisionUsd === (lead.comisionUsd?.toString() ?? "") &&
      honorariosUsd === (lead.honorariosUsd?.toString() ?? "") &&
      honorariosArs === (lead.honorariosArs?.toString() ?? "") &&
      gastosArs === (lead.gastosArs?.toString() ?? "")
    )
      return;
    startTransition(() => {
      actualizarComisionHonorariosLeadAction(lead.id, comisionUsd, honorariosUsd, honorariosArs, gastosArs).then((res) => {
        if (!res.ok) alert(`No se pudo guardar comisión/honorarios/gastos: ${res.error}`);
        else
          onActualizado(lead.id, {
            comisionUsd: comisionUsd ? Number(comisionUsd) : null,
            honorariosUsd: honorariosUsd ? Number(honorariosUsd) : null,
            honorariosArs: honorariosArs ? Number(honorariosArs) : null,
            gastosArs: gastosArs ? Number(gastosArs) : null,
          });
      });
    });
  };

  const eliminar = () => {
    if (!confirm(`¿Eliminar la reserva de ${lead.nombre}? Esta acción no se puede deshacer.`)) return;
    startTransition(() => {
      deleteLeadAction(lead.id);
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
        <div className="flex shrink-0 items-center gap-1.5">
          {puedeBorrar && (
            <button type="button" onClick={eliminar} aria-label="Eliminar" className="text-brand-black/25 hover:text-red-600">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <GripVertical className="h-4 w-4 text-brand-black/25" />
        </div>
      </div>

      {/* Datos principales, siempre visibles */}
      <div className="space-y-0.5 text-xs text-brand-black/60">
        {lead.proyectoNombre && <p>Barrio: {lead.proyectoNombre}</p>}
        {lead.manzana && <p>Manzana: {lead.manzana}</p>}
        {lead.loteNumero && <p>Lote: {lead.loteNumero}</p>}
      </div>

      <button
        type="button"
        onClick={() => setExpandido((v) => !v)}
        className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-green-700"
      >
        {expandido ? (
          <>
            <ChevronUp className="h-3.5 w-3.5" /> Ver menos
          </>
        ) : (
          <>
            <ChevronDown className="h-3.5 w-3.5" /> Ver más
          </>
        )}
      </button>

      {expandido && (
        <div className="mt-2 space-y-2">
          {puedeAsignar ? (
            <select
              defaultValue={lead.proyectoId ?? ""}
              onChange={(e) => {
                const proyectoId = e.target.value || null;
                const proyectoNombre = proyectos.find((p) => p.id === proyectoId)?.nombre;
                startTransition(() => {
                  cambiarProyectoLeadAction(lead.id, proyectoId).then((res) => {
                    if (res.ok) onActualizado(lead.id, { proyectoId, proyectoNombre });
                  });
                });
              }}
              className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs text-brand-black/70"
            >
              <option value="">Sin desarrollo</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          ) : (
            lead.lotes.length > 0 && (
              <div className="text-xs text-brand-black/50">
                {lead.lotes.length > 1 && (
                  <p className="font-medium text-brand-black/70">{lead.lotes.length} lotes en esta operación</p>
                )}
                {lead.lotes.map((l) => (
                  <p key={l.id}>
                    Manzana {l.manzana} — Lote {l.numero} ({l.superficieM2} m²)
                  </p>
                ))}
              </div>
            )
          )}

          <div className="space-y-1 text-xs text-brand-black/60">
            <p className="flex items-center gap-1.5">
              <Mail className="h-3 w-3" /> {lead.email}
            </p>
            <a
              href={buildWhatsappClienteUrl(lead.telefono)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 hover:text-brand-green-700 hover:underline"
              title="Abrir conversación de WhatsApp"
            >
              <Phone className="h-3 w-3" /> {lead.telefono}
            </a>
          </div>

          {puedeAsignar && (
            <select
              defaultValue={lead.asignadoA ?? ""}
              onChange={(e) => {
                const asignadoA = e.target.value || null;
                const asignadoNombre = vendedores.find((v) => v.id === asignadoA)?.nombre ?? undefined;
                startTransition(() => {
                  asignarLeadAction(lead.id, asignadoA).then((res) => {
                    if (res.ok) onActualizado(lead.id, { asignadoA, asignadoNombre });
                  });
                });
              }}
              className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
            >
              <option value="">Sin asignar</option>
              {vendedores.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre ?? v.email}
                </option>
              ))}
            </select>
          )}

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Fecha de firma escribanía</label>
              <input
                type="date"
                value={fechaFirma}
                onChange={(e) => setFechaFirma(e.target.value)}
                onBlur={guardarFirma}
                className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Horario</label>
              <input
                type="time"
                value={horarioFirma}
                onChange={(e) => setHorarioFirma(e.target.value)}
                onBlur={guardarFirma}
                className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="mb-1 block text-[11px] font-medium text-brand-black/50">N° de transacción</label>
              <input
                value={numeroTransaccion}
                onChange={(e) => setNumeroTransaccion(e.target.value)}
                onBlur={guardarPago}
                className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Importe cobrado (seña, $ ARS)</label>
              <input
                type="number"
                value={importeCobrado}
                onChange={(e) => setImporteCobrado(e.target.value)}
                onBlur={guardarPago}
                className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
              />
            </div>
          </div>

          {puedeAsignar && (
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Comisión (USD)</label>
                <input
                  type="number"
                  value={comisionUsd}
                  onChange={(e) => setComisionUsd(e.target.value)}
                  onBlur={guardarComisionHonorarios}
                  className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Honorarios (USD)</label>
                <input
                  type="number"
                  value={honorariosUsd}
                  onChange={(e) => setHonorariosUsd(e.target.value)}
                  onBlur={guardarComisionHonorarios}
                  className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Honorarios (ARS)</label>
                <input
                  type="number"
                  value={honorariosArs}
                  onChange={(e) => setHonorariosArs(e.target.value)}
                  onBlur={guardarComisionHonorarios}
                  className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-black/50">Gastos (ARS)</label>
                <input
                  type="number"
                  value={gastosArs}
                  onChange={(e) => setGastosArs(e.target.value)}
                  onBlur={guardarComisionHonorarios}
                  className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
                />
              </div>
            </div>
          )}

          {lead.estado === "vendido" && (
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-black/50">
                  Fecha de nacimiento (cumpleaños)
                </label>
                <input
                  type="date"
                  defaultValue={lead.fechaNacimiento ?? ""}
                  onChange={(e) => {
                    const fechaNacimiento = e.target.value || null;
                    startTransition(() => {
                      actualizarFechaNacimientoLeadAction(lead.id, fechaNacimiento).then((res) => {
                        if (res.ok) onActualizado(lead.id, { fechaNacimiento });
                      });
                    });
                  }}
                  className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-brand-black/50">
                  Sexo (día del padre/madre)
                </label>
                <select
                  defaultValue={lead.sexo ?? ""}
                  onChange={(e) => {
                    const sexo = (e.target.value || null) as "M" | "F" | null;
                    startTransition(() => {
                      actualizarSexoLeadAction(lead.id, sexo).then((res) => {
                        if (res.ok) onActualizado(lead.id, { sexo });
                      });
                    });
                  }}
                  className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs"
                >
                  <option value="">Sin definir</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </div>
            </div>
          )}

          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            onBlur={guardarObservaciones}
            placeholder="Observaciones..."
            rows={2}
            className="w-full rounded-lg border border-black/10 px-2 py-1 text-xs focus:border-brand-green-600 focus:outline-none"
          />
        </div>
      )}
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
  const puedeBorrar = rolActual === "administrador";

  const columnas = useMemo(
    () => COLUMNAS.map((col) => ({ ...col, leads: leads.filter((l) => l.estado === col.estado) })),
    [leads]
  );

  const mover = async (id: string, estado: EstadoLead) => {
    const anterior = leads.find((l) => l.id === id)?.estado;
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado } : l)));
    const res = await actualizarEstadoLeadAction(id, estado);
    if (!res.ok && anterior) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, estado: anterior } : l)));
      alert(res.error);
    }
  };

  // El tablero es la fuente de verdad de cada lead mientras la página está
  // abierta; cada guardado exitoso en la tarjeta actualiza esta copia para
  // que no se "revierta" al mover el lead a otra columna.
  const actualizarLeadLocal = (id: string, patch: Partial<Lead>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
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
                puedeBorrar={puedeBorrar}
                onMoved={() => setDragOver(null)}
                onActualizado={actualizarLeadLocal}
              />
            ))}
            {col.leads.length === 0 && <p className="px-1 py-6 text-center text-xs text-brand-black/30">Sin leads</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
