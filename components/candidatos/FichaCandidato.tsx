"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Pencil, Save, Trash2 } from "lucide-react";
import { agregarObservacionAction, cambiarEstadoAction, eliminarCandidatoAction } from "@/lib/candidatos/actions";
import { armarMensajeWhatsapp, buildWhatsappCandidatoUrl } from "@/lib/candidatos/whatsapp";
import {
  CARGO_LABEL,
  DISPONIBILIDAD_LABEL,
  ESTADOS,
  ESTADO_COLOR,
  ESTADO_LABEL,
} from "@/lib/candidatos/constants";
import { CLASIFICACION_COLOR } from "@/lib/candidatos/scoring";
import { formatPesosDiarios } from "@/lib/candidatos/format";
import type { Candidato, EstadoCandidato } from "@/types/candidatos";

function Dato({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-obra-slate-950">{value || "—"}</p>
    </div>
  );
}

export default function FichaCandidato({
  candidato,
  mensajeWhatsappPlantilla,
}: {
  candidato: Candidato;
  mensajeWhatsappPlantilla: string;
}) {
  const router = useRouter();
  const [observaciones, setObservaciones] = useState(candidato.observaciones ?? "");
  const [guardandoObs, setGuardandoObs] = useState(false);
  const [estado, setEstado] = useState(candidato.estado);
  const [cambiandoEstado, setCambiandoEstado] = useState(false);

  const onCambiarEstado = async (nuevo: EstadoCandidato) => {
    setCambiandoEstado(true);
    const res = await cambiarEstadoAction(candidato.id, nuevo);
    if (res.ok) setEstado(nuevo);
    else alert(res.error);
    setCambiandoEstado(false);
  };

  const guardarObservaciones = async () => {
    setGuardandoObs(true);
    const res = await agregarObservacionAction(candidato.id, observaciones);
    if (!res.ok) alert(res.error);
    setGuardandoObs(false);
  };

  const eliminar = async () => {
    if (!confirm(`¿Eliminar a ${candidato.nombreApellido}? Esta acción no se puede deshacer.`)) return;
    const res = await eliminarCandidatoAction(candidato.id);
    if (res.ok) router.push("/postulantes/candidatos");
    else alert(res.error);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-obra-slate-950">{candidato.nombreApellido}</h1>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${ESTADO_COLOR[estado]}`}>
              {ESTADO_LABEL[estado]}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {CARGO_LABEL[candidato.cargo]} · DNI {candidato.dni} · {candidato.telefono}
          </p>
          <p className={`mt-1 text-sm font-semibold ${CLASIFICACION_COLOR[candidato.clasificacion ?? "Candidato a evaluar"]}`}>
            Puntaje: {candidato.puntaje}/100 · {candidato.clasificacion}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/postulantes/candidatos/${candidato.id}?editar=1`}
            className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"
          >
            <Pencil className="h-4 w-4" /> Editar candidato
          </Link>
          <a
            href={buildWhatsappCandidatoUrl(candidato.telefono, armarMensajeWhatsapp(mensajeWhatsappPlantilla, candidato))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366]/15 px-4 py-2 text-sm font-semibold text-[#1a9c4a] hover:bg-[#25D366]/25"
          >
            <MessageCircle className="h-4 w-4" /> Contactar por WhatsApp
          </a>
          <button
            onClick={eliminar}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-obra-slate-950">Cambiar estado</p>
        <div className="flex flex-wrap gap-2">
          {ESTADOS.map((e) => (
            <button
              key={e}
              disabled={cambiandoEstado}
              onClick={() => onCambiarEstado(e)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ring-1 transition disabled:opacity-50 ${
                e === estado ? ESTADO_COLOR[e] : "bg-white text-slate-500 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {ESTADO_LABEL[e]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-obra-orange-600">Datos personales</p>
          <Dato label="Localidad" value={candidato.localidad} />
          <Dato label="Edad" value={candidato.edad} />
          <Dato label="Teléfono" value={candidato.telefono} />
          <Dato label="DNI" value={candidato.dni} />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-obra-orange-600">Perfil laboral</p>
          <Dato label="Cargo" value={CARGO_LABEL[candidato.cargo]} />
          <Dato label="Años de experiencia" value={candidato.anosExperiencia} />
          <Dato label="Especialidad" value={candidato.especialidad} />
          <Dato label="Trabajos que sabe realizar" value={candidato.trabajosQueSabe} />
          <Dato label="Experiencia comprobable" value={candidato.experienciaComprobable ? "Sí" : "No"} />
          <Dato label="Referencias laborales" value={candidato.referenciasLaborales} />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-obra-orange-600">Disponibilidad y remuneración</p>
          <Dato
            label="Disponibilidad para comenzar"
            value={candidato.disponibilidadInicio ? DISPONIBILIDAD_LABEL[candidato.disponibilidadInicio] : null}
          />
          <Dato label="Disponibilidad horaria" value={candidato.disponibilidadHoraria} />
          <Dato label="Pretensión salarial diaria" value={formatPesosDiarios(candidato.pretensionSalarialDiaria)} />
          <Dato label="Última remuneración diaria" value={formatPesosDiarios(candidato.ultimaRemuneracionDiaria)} />
          <Dato label="Acepta trabajo por jornada" value={candidato.aceptaJornada ? "Sí" : "No"} />
          <Dato label="Acepta trabajo por obra" value={candidato.aceptaObra ? "Sí" : "No"} />
          <Dato label="Herramientas propias" value={candidato.herramientasPropias ? "Sí" : "No"} />
          <Dato label="Movilidad propia" value={candidato.movilidadPropia ? "Sí" : "No"} />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-obra-orange-600">Observaciones</p>
          <textarea
            rows={6}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-obra-slate-950 focus:border-obra-orange-400 focus:outline-none"
            placeholder="Notas de entrevistas, referencias verificadas, etc."
          />
          <button
            onClick={guardarObservaciones}
            disabled={guardandoObs}
            className="inline-flex items-center gap-1.5 rounded-full bg-obra-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-obra-slate-800 disabled:opacity-60"
          >
            <Save className="h-4 w-4" /> Guardar observaciones
          </button>
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Origen: {candidato.origen === "publica" ? "Formulario público" : candidato.origen === "importado" ? "Importado desde Excel" : "Carga manual"}
        {" · "}Alta: {new Date(candidato.creadoEn).toLocaleDateString("es-AR")}
        {" · "}Última actualización: {new Date(candidato.actualizadoEn).toLocaleDateString("es-AR")}
      </p>
    </div>
  );
}
