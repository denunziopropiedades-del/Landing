"use client";

import { useState } from "react";
import Link from "next/link";
import { Briefcase, CheckCircle2, Eye, MapPin, MessageCircle, Pencil, Trash2, XCircle } from "lucide-react";
import { cambiarEstadoAction, eliminarCandidatoAction } from "@/lib/candidatos/actions";
import { armarMensajeWhatsapp, buildWhatsappCandidatoUrl } from "@/lib/candidatos/whatsapp";
import { CARGO_LABEL, ESTADO_COLOR, ESTADO_LABEL, DISPONIBILIDAD_LABEL } from "@/lib/candidatos/constants";
import { CLASIFICACION_COLOR } from "@/lib/candidatos/scoring";
import { formatPesosDiarios } from "@/lib/candidatos/format";
import type { Candidato, EstadoCandidato } from "@/types/candidatos";

export default function CandidatosGrid({
  candidatos: candidatosIniciales,
  mensajeWhatsappPlantilla,
}: {
  candidatos: Candidato[];
  mensajeWhatsappPlantilla: string;
}) {
  const [candidatos, setCandidatos] = useState(candidatosIniciales);

  const cambiarEstado = async (id: string, estado: EstadoCandidato) => {
    const anterior = candidatos.find((c) => c.id === id)?.estado;
    setCandidatos((prev) => prev.map((c) => (c.id === id ? { ...c, estado } : c)));
    const res = await cambiarEstadoAction(id, estado);
    if (!res.ok && anterior) {
      setCandidatos((prev) => prev.map((c) => (c.id === id ? { ...c, estado: anterior } : c)));
      alert(res.error);
    }
  };

  const eliminar = async (id: string) => {
    if (!confirm("¿Eliminar este candidato? Esta acción no se puede deshacer.")) return;
    const previos = candidatos;
    setCandidatos((prev) => prev.filter((c) => c.id !== id));
    const res = await eliminarCandidatoAction(id);
    if (!res.ok) {
      setCandidatos(previos);
      alert(res.error);
    }
  };

  if (candidatos.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-400">
        No hay candidatos que coincidan con estos filtros.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {candidatos.map((c) => (
        <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-obra-slate-950">{c.nombreApellido}</p>
              <p className="text-sm text-slate-500">{CARGO_LABEL[c.cargo]}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${ESTADO_COLOR[c.estado]}`}
            >
              {ESTADO_LABEL[c.estado]}
            </span>
          </div>

          <div className="space-y-1 text-sm text-slate-600">
            {c.localidad && (
              <p className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400" /> {c.localidad}
              </p>
            )}
            <p className="flex items-center gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-slate-400" /> {c.anosExperiencia} años de experiencia
              {c.especialidad ? ` · ${c.especialidad}` : ""}
            </p>
            {c.disponibilidadInicio && <p>Disponibilidad: {DISPONIBILIDAD_LABEL[c.disponibilidadInicio]}</p>}
            <p className="font-semibold text-obra-slate-950">Pretensión diaria: {formatPesosDiarios(c.pretensionSalarialDiaria)}</p>
            <p className={`text-xs font-semibold ${CLASIFICACION_COLOR[c.clasificacion ?? "Candidato a evaluar"]}`}>
              Puntaje: {c.puntaje}/100 · {c.clasificacion}
            </p>
          </div>

          <div className="mt-1 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3">
            <Link
              href={`/postulantes/candidatos/${c.id}`}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <Eye className="h-3.5 w-3.5" /> Ver ficha
            </Link>
            <Link
              href={`/postulantes/candidatos/${c.id}?editar=1`}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <Pencil className="h-3.5 w-3.5" /> Editar
            </Link>
            <a
              href={buildWhatsappCandidatoUrl(c.telefono, armarMensajeWhatsapp(mensajeWhatsappPlantilla, c))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/15 px-3 py-1.5 text-xs font-semibold text-[#1a9c4a] hover:bg-[#25D366]/25"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
            <button
              onClick={() => cambiarEstado(c.id, "preseleccionado")}
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-100"
            >
              Preseleccionar
            </button>
            <button
              onClick={() => cambiarEstado(c.id, "contratado")}
              className="inline-flex items-center gap-1 rounded-full bg-obra-orange-500/10 px-3 py-1.5 text-xs font-semibold text-obra-orange-700 hover:bg-obra-orange-500/20"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Contratar
            </button>
            <button
              onClick={() => cambiarEstado(c.id, "descartado")}
              className="inline-flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" /> Descartar
            </button>
            <button
              onClick={() => eliminar(c.id)}
              className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-semibold text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Eliminar candidato"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
