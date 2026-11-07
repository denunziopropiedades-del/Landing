"use client";

import { useState } from "react";

type Props = {
  token: string;
  numero: string;
  resumen: { etiqueta: string; valor: string }[];
  emailEnmascarado: string;
  hash: string | null;
};

/** Aceptar o rechazar la reserva: pide código por mail, resumen, casilla de consentimiento y decisión. */
export default function DecisionReserva({ token, numero, resumen, emailEnmascarado, hash }: Props) {
  const [paso, setPaso] = useState<"inicio" | "codigo" | "listo">("inicio");
  const [decision, setDecision] = useState<"aceptado" | "rechazado" | null>(null);
  const [codigo, setCodigo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [consiento, setConsiento] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{ decision: string; fecha: string } | null>(null);

  const pedirCodigo = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch(`/api/cliente/documentos/${token}/codigo`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo enviar el código.");
      setInfo(`Te enviamos un código de 6 dígitos a ${j.enviadoA}. Vence en 10 minutos.`);
      setPaso("codigo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el código.");
    } finally {
      setEnviando(false);
    }
  };

  const confirmar = async () => {
    if (!decision) return;
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch(`/api/cliente/documentos/${token}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, decision, consentimiento: consiento, motivo }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No se pudo registrar tu decisión.");
      setResultado({ decision: j.decision, fecha: j.fecha });
      setPaso("listo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo registrar tu decisión.");
    } finally {
      setEnviando(false);
    }
  };

  if (paso === "listo" && resultado) {
    const ok = resultado.decision === "aceptado";
    return (
      <section className={`rounded-2xl p-5 text-white shadow-sm ${ok ? "bg-emerald-600" : "bg-red-600"}`}>
        <p className="text-lg font-bold">{ok ? "Aceptaste la reserva" : "Rechazaste la reserva"}</p>
        <p className="mt-1 text-sm">
          Quedó registrado el {new Date(resultado.fecha).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })} hs. Te
          enviamos la constancia por mail.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-2xl border-2 border-[#16294f]/15 bg-white p-5 shadow-sm">
      <div>
        <p className="text-base font-bold text-slate-900">Aceptar o rechazar la reserva</p>
        <p className="mt-1 text-sm text-slate-600">
          Para confirmar tu decisión verificamos tu identidad con un código que te enviamos por mail ({emailEnmascarado}).
        </p>
      </div>

      {paso === "inicio" && (
        <button
          type="button"
          onClick={pedirCodigo}
          disabled={enviando}
          className="w-full rounded-full bg-[#16294f] px-6 py-3 font-semibold text-white disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviarme el código"}
        </button>
      )}

      {paso === "codigo" && (
        <div className="space-y-4">
          {info && <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">{info}</p>}

          <div className="rounded-xl bg-slate-50 p-4 text-sm">
            <p className="mb-2 font-semibold text-slate-800">Condiciones esenciales · Reserva N.º {numero}</p>
            <dl className="space-y-1">
              {resumen.map((r) => (
                <div key={r.etiqueta} className="flex justify-between gap-3">
                  <dt className="text-slate-500">{r.etiqueta}</dt>
                  <dd className="text-right font-medium text-slate-900">{r.valor}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-xs text-slate-500">Las condiciones completas están en el documento PDF.</p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDecision("aceptado")}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                decision === "aceptado" ? "border-emerald-600 bg-emerald-600 text-white" : "border-emerald-600 text-emerald-700"
              }`}
            >
              Aceptar reserva
            </button>
            <button
              type="button"
              onClick={() => setDecision("rechazado")}
              className={`rounded-xl border-2 px-3 py-3 text-sm font-bold ${
                decision === "rechazado" ? "border-red-600 bg-red-600 text-white" : "border-red-300 text-red-700"
              }`}
            >
              Rechazar
            </button>
          </div>

          {decision === "rechazado" && (
            <label className="block text-sm text-slate-700">
              Motivo (opcional)
              <input
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
          )}

          {decision && (
            <>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={consiento} onChange={(e) => setConsiento(e.target.checked)} className="mt-1 h-4 w-4" />
                <span>
                  Declaro haber leído la reserva N.º {numero} y <b>{decision === "aceptado" ? "acepto" : "rechazo"}</b> sus condiciones.
                  Entiendo que esta constancia electrónica no constituye firma digital.
                  {hash && <span className="mt-1 block break-all font-mono text-[10px] text-slate-400">Huella del documento: {hash}</span>}
                </span>
              </label>

              <label className="block text-sm text-slate-700">
                Código recibido por mail
                <input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center font-mono text-2xl tracking-[0.4em]"
                />
              </label>

              <button
                type="button"
                onClick={confirmar}
                disabled={enviando || !consiento || codigo.length !== 6}
                className={`w-full rounded-full px-6 py-3 font-semibold text-white disabled:opacity-50 ${
                  decision === "aceptado" ? "bg-emerald-600" : "bg-red-600"
                }`}
              >
                {enviando ? "Registrando…" : decision === "aceptado" ? "Confirmar aceptación" : "Confirmar rechazo"}
              </button>
              <button type="button" onClick={pedirCodigo} disabled={enviando} className="w-full text-xs text-slate-500 underline">
                No me llegó el código: enviarlo de nuevo
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
    </section>
  );
}
