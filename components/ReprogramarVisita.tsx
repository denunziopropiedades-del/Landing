"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { HORARIOS_VISITA } from "@/lib/agenda";

function formatearFecha(fecha: string) {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(a, m - 1, d).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" });
}

export default function ReprogramarVisita({
  token,
  nombre,
  fechaActual,
  horarioActual,
}: {
  token: string;
  nombre: string;
  fechaActual: string;
  horarioActual: string;
}) {
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [mensajeError, setMensajeError] = useState<string | null>(null);

  useEffect(() => {
    setHorario("");
    if (!fecha) {
      setOcupados([]);
      return;
    }
    let cancelado = false;
    setCargando(true);
    fetch(`/api/visitas/disponibilidad?fecha=${fecha}&token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelado) setOcupados(Array.isArray(data.ocupados) ? data.ocupados : []);
      })
      .catch(() => {
        if (!cancelado) setOcupados([]);
      })
      .finally(() => {
        if (!cancelado) setCargando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [fecha, token]);

  const enviar = async () => {
    if (!fecha || !horario) return;
    setEstado("enviando");
    setMensajeError(null);
    try {
      const res = await fetch("/api/visitas/reprogramar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, fecha, horario }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setMensajeError(typeof body?.error === "string" ? body.error : null);
        throw new Error("request-failed");
      }
      setEstado("ok");
    } catch {
      setEstado("error");
    }
  };

  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

  if (estado === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-green-600/30 bg-white p-10 text-center">
        <CalendarCheck className="h-12 w-12 text-brand-green-700" />
        <p className="font-display text-xl font-bold text-brand-black">¡Visita reprogramada!</p>
        <p className="text-sm text-brand-black/70">
          Te esperamos el {formatearFecha(fecha)} a las {horario} hs. Te mandamos la confirmación por mail.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 shadow-sm">
      <p className="text-brand-black/80">
        Hola {nombre}, tu visita está agendada para el <b>{formatearFecha(fechaActual)}</b> a las{" "}
        <b>{horarioActual} hs</b>. Elegí el nuevo día y horario:
      </p>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Nueva fecha</label>
        <input
          type="date"
          min={hoy}
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none"
        />
      </div>

      {fecha && (
        <div className="mt-5">
          <label className="mb-1.5 block text-sm font-medium text-brand-black/80">
            Nuevo horario {cargando && <Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin" />}
          </label>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {HORARIOS_VISITA.map((h) => {
              const noDisponible = cargando || ocupados.includes(h) || (fecha === fechaActual && h === horarioActual);
              const seleccionado = horario === h;
              return (
                <button
                  key={h}
                  type="button"
                  disabled={noDisponible}
                  onClick={() => setHorario(h)}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    noDisponible
                      ? "cursor-not-allowed border-red-200 bg-red-50 text-red-400 line-through"
                      : seleccionado
                        ? "border-brand-green-600 bg-brand-green-600 text-white"
                        : "border-black/10 text-brand-black/80 hover:border-brand-green-600"
                  }`}
                >
                  {h} hs
                </button>
              );
            })}
          </div>
        </div>
      )}

      {estado === "error" && (
        <p className="mt-4 text-sm text-red-600">{mensajeError ?? "Ocurrió un error. Intentá nuevamente."}</p>
      )}

      <button
        type="button"
        onClick={enviar}
        disabled={!fecha || !horario || estado === "enviando"}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-green-700 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-green-600 disabled:opacity-50"
      >
        {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
        Confirmar nuevo horario
      </button>
    </div>
  );
}
