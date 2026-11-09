"use client";

import { useState } from "react";

type Turnos = { fecha: string; horarios: string[] }[];

const fechaLarga = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

export default function ElegirFirma({ token }: { token: string }) {
  const [dni, setDni] = useState("");
  const [datos, setDatos] = useState<{ nombre: string; proyecto: string | null; actual: { fecha: string; horario: string } | null; turnos: Turnos } | null>(null);
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState<{ fecha: string; horario: string } | null>(null);

  const llamar = async (body: Record<string, string>) => {
    setCargando(true);
    setError(null);
    try {
      const res = await fetch(`/api/firma/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dni, ...body }) });
      const j = await res.json();
      if (!res.ok) {
        setError(j.error ?? "No se pudo continuar.");
        if (j.turnos && datos) setDatos({ ...datos, turnos: j.turnos });
        return null;
      }
      return j;
    } catch {
      setError("Sin conexión. Probá de nuevo.");
      return null;
    } finally {
      setCargando(false);
    }
  };

  if (listo) {
    return (
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm">
        <p className="text-4xl">✅</p>
        <p className="mt-2 text-lg font-bold text-slate-800">¡Listo! Tu firma quedó agendada</p>
        <p className="mt-2 text-slate-700">
          <b className="capitalize">{fechaLarga(listo.fecha)}</b> a las <b>{listo.horario} hs</b>
        </p>
        <p className="mt-3 text-sm text-slate-500">Te enviamos un mail con la dirección de la escribanía y la documentación que tenés que llevar.</p>
      </div>
    );
  }

  if (!datos) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const j = await llamar({ accion: "validar" });
          if (j) setDatos(j);
        }}
        className="rounded-2xl bg-white p-6 shadow-sm"
      >
        <label className="block text-sm font-semibold text-slate-700">Para continuar, ingresá tu DNI</label>
        <input
          inputMode="numeric"
          autoComplete="off"
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/[^\d.]/g, ""))}
          placeholder="Ej: 30123456"
          className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tracking-wider"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <button disabled={cargando || dni.replace(/\D/g, "").length < 6} className="mt-4 w-full rounded-xl bg-[#16294f] py-3 font-semibold text-white disabled:opacity-50">
          {cargando ? "Verificando…" : "Continuar"}
        </button>
      </form>
    );
  }

  const horariosDelDia = datos.turnos.find((t) => t.fecha === fecha)?.horarios ?? [];

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-lg font-bold text-slate-800">Hola {datos.nombre}!</p>
      {datos.proyecto && <p className="text-sm text-slate-500">{datos.proyecto}</p>}
      {datos.actual && (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          Tu firma está agendada para el <b className="capitalize">{fechaLarga(datos.actual.fecha)}</b> a las <b>{datos.actual.horario} hs</b>. Si necesitás, podés cambiarla abajo.
        </p>
      )}

      {datos.turnos.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">Por el momento no hay turnos disponibles. Escribinos por WhatsApp al <b>11-2742-4512</b> y lo coordinamos.</p>
      ) : (
        <>
          <p className="mt-5 text-sm font-semibold text-slate-700">1. Elegí el día</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {datos.turnos.map((t) => (
              <button
                key={t.fecha}
                type="button"
                onClick={() => {
                  setFecha(t.fecha);
                  setHorario("");
                }}
                className={`rounded-xl border px-3 py-2 text-sm capitalize ${fecha === t.fecha ? "border-[#16294f] bg-[#16294f] text-white" : "border-slate-300 text-slate-700"}`}
              >
                {fechaLarga(t.fecha)}
              </button>
            ))}
          </div>

          {fecha && (
            <>
              <p className="mt-5 text-sm font-semibold text-slate-700">2. Elegí el horario</p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {horariosDelDia.map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setHorario(h)}
                    className={`rounded-xl border px-3 py-2 text-sm ${horario === h ? "border-[#6cc72f] bg-[#6cc72f] font-bold text-[#0f1b2d]" : "border-slate-300 text-slate-700"}`}
                  >
                    {h} hs
                  </button>
                ))}
              </div>
            </>
          )}

          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
          <button
            type="button"
            disabled={!fecha || !horario || cargando}
            onClick={async () => {
              const j = await llamar({ accion: "elegir", fecha, horario });
              if (j?.ok) setListo({ fecha: j.fecha, horario: j.horario });
            }}
            className="mt-5 w-full rounded-xl bg-[#16294f] py-3 font-semibold text-white disabled:opacity-50"
          >
            {cargando ? "Guardando…" : "Confirmar firma"}
          </button>
        </>
      )}
    </div>
  );
}
