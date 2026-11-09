"use client";

import { useState, useTransition } from "react";
import { generarLinkFirmaAction } from "@/lib/admin/actions";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";
import type { Lead } from "@/types/site";

const dm = (iso: string) => {
  const [, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
};

/**
 * En la tarjeta del CRM: genera el link para que el cliente elija día y horario
 * de firma en escribanía (valida con su DNI). Opcional: ofrecer solo ciertos turnos.
 */
export default function LinkFirmaEscribania({ lead, onActualizado }: { lead: Lead; onActualizado: (id: string, patch: Partial<Lead>) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [opciones, setOpciones] = useState<{ fecha: string; horario: string }[]>([]);
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const vigente = lead.firmaLinkVence && Date.parse(lead.firmaLinkVence) > Date.now();
  const mensaje = (url: string) =>
    `Hola ${lead.nombre}! Para coordinar la firma en escribanía, elegí el día y horario que te quede mejor en este link (te va a pedir tu DNI): ${url}`;

  const generar = () =>
    startTransition(async () => {
      setError(null);
      const r = await generarLinkFirmaAction(lead.id, opciones);
      if (!r.ok) return setError(r.error);
      setLink(r.url);
      onActualizado(lead.id, { firmaLinkVence: r.vence, firmaElegidaEn: null });
      try {
        await navigator.clipboard.writeText(r.url);
      } catch {}
    });

  return (
    <div className="rounded-lg border border-dashed border-brand-green-700/30 bg-brand-cream/40 p-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-brand-black/70">Link para que el cliente elija la firma</p>
        <button type="button" onClick={() => setAbierto((v) => !v)} className="font-semibold text-brand-green-700">
          {abierto ? "Cerrar" : vigente ? "Ver / nuevo" : "Crear"}
        </button>
      </div>
      {lead.firmaElegidaEn ? (
        <p className="mt-1 text-emerald-700">✓ El cliente eligió su turno desde el link el {dm(lead.firmaElegidaEn)}.</p>
      ) : vigente ? (
        <p className="mt-1 text-brand-black/50">Link enviado, vigente hasta el {dm(lead.firmaLinkVence!)}. Esperando que elija.</p>
      ) : null}

      {abierto && (
        <div className="mt-2 space-y-2">
          {!lead.dni && <p className="text-amber-700">Cargá el DNI del cliente: lo usa para validar el link.</p>}
          <div>
            <p className="text-[11px] text-brand-black/50">
              Turnos a ofrecer (opcional). Si no agregás ninguno, puede elegir de lunes a viernes de 9 a 17 hs en los próximos 21 días.
            </p>
            <div className="mt-1 flex gap-1">
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="min-w-0 flex-1 rounded border border-black/10 px-1 py-0.5" />
              <input type="time" value={horario} onChange={(e) => setHorario(e.target.value)} className="w-20 rounded border border-black/10 px-1 py-0.5" />
              <button
                type="button"
                disabled={!fecha || !horario}
                onClick={() => {
                  if (!opciones.some((o) => o.fecha === fecha && o.horario === horario)) setOpciones([...opciones, { fecha, horario }]);
                  setHorario("");
                }}
                className="rounded bg-brand-green-700 px-2 font-semibold text-white disabled:opacity-40"
              >
                +
              </button>
            </div>
            {opciones.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {opciones.map((o) => (
                  <button
                    key={`${o.fecha}${o.horario}`}
                    type="button"
                    onClick={() => setOpciones(opciones.filter((x) => x !== o))}
                    className="rounded-full bg-white px-2 py-0.5 shadow-sm"
                    title="Quitar"
                  >
                    {dm(o.fecha)} {o.horario} ✕
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" disabled={pendiente} onClick={generar} className="w-full rounded-lg bg-brand-green-700 py-1.5 font-semibold text-white disabled:opacity-50">
            {pendiente ? "Generando…" : vigente ? "Generar link nuevo (anula el anterior)" : "Generar link"}
          </button>
          {error && <p className="text-red-600">{error}</p>}
          {link && (
            <div className="space-y-1">
              <p className="break-all rounded bg-white p-1.5 text-brand-black/70">{link}</p>
              <p className="text-emerald-700">Link copiado.</p>
              {lead.telefono && (
                <a
                  href={buildWhatsappClienteUrl(lead.telefono, mensaje(link))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-lg bg-[#25d366] py-1.5 text-center font-semibold text-white"
                >
                  Enviar por WhatsApp
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
