"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  anularDocAction,
  emitirLibreDeudaAction,
  emitirReservaAction,
  enviarEmailDocAction,
  generarLinkPagoAction,
  marcarPagoReservaAction,
  nuevoLinkDocAction,
  revocarLinkAction,
  revocarTodosLinksAction,
  whatsappDocAction,
  type CandidatoLead,
  type DatosPanelDocs,
} from "@/lib/admin/docs-clientes-actions";
import {
  ETIQUETA_ESTADO,
  NOMBRE_TIPO,
  estadoEfectivo,
  fechaAr,
  hoyAr,
  monto,
  textoHonorariosReserva,
  type DatosLibreDeuda,
  type DatosReserva,
} from "@/lib/docs-clientes/compartido";

type Tab = "emitidos" | "reserva" | "libre";
type Doc = DatosPanelDocs["docs"][number];

const CLASE_ESTADO: Record<string, string> = {
  emitido: "bg-slate-100 text-slate-700",
  enviado: "bg-amber-100 text-amber-800",
  aceptado: "bg-emerald-100 text-emerald-800",
  rechazado: "bg-red-100 text-red-800",
  vencido: "bg-slate-200 text-slate-700",
  anulado: "bg-red-600 text-white",
};

const EVENTO: Record<string, string> = {
  emitido: "Documento emitido",
  aviso_emitido: "Aviso interno de emisión",
  link_generado: "Enlace privado generado",
  link_revocado: "Enlace revocado",
  links_revocados: "Todos los enlaces revocados",
  email_enviado: "Enviado por email",
  email_error: "Error al enviar email",
  whatsapp_preparado: "Mensaje de WhatsApp preparado",
  cliente_portal: "El cliente abrió su enlace",
  cliente_pdf: "El cliente vio el PDF",
  cliente_descarga: "El cliente descargó el PDF",
  codigo_enviado: "Código de verificación enviado",
  codigo_error: "Error al enviar código",
  codigo_fallido: "Código incorrecto",
  cliente_acepto: "✅ El cliente ACEPTÓ",
  cliente_rechazo: "❌ El cliente RECHAZÓ",
  constancia_enviada: "Constancia enviada al cliente",
  aviso_por_vencer: "Aviso de reserva por vencer",
  vencida: "Reserva vencida",
  anulado: "Documento anulado",
  pago_link_creado: "Link de pago de Mercado Pago creado",
  pago_link_error: "Error al crear el link de pago",
  pago_mp_aprobado: "💰 Pago acreditado por Mercado Pago",
  pago_manual: "Pago marcado como abonado",
  pago_revertido: "Pago vuelto a pendiente",
};

const CANAL: Record<string, string> = { email: "Email", whatsapp: "WhatsApp", copia: "Copiado", recordatorio: "Recordatorio" };

const input = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const btn = "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50";

function Campo({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-medium text-brand-black/70 ${className}`}>
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

const sumarDias = (iso: string, d: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86400000).toISOString().slice(0, 10);

export default function DocumentosClientesManager({ datos, condicionesBase }: { datos: DatosPanelDocs; condicionesBase: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("emitidos");
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const correr = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, ok: (r: Record<string, unknown>) => string | null) =>
    startTransition(async () => {
      setError(null);
      setAviso(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No se pudo completar.");
      else {
        const msg = ok(r);
        if (msg) setAviso(msg);
        router.refresh();
      }
    });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(
          [
            ["emitidos", `Emitidos (${datos.docs.length})`],
            ["reserva", "+ Nueva reserva"],
            ["libre", "+ Libre deuda"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${tab === id ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {aviso && <p className="whitespace-pre-line break-all rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}

      {tab === "emitidos" && (
        <Emitidos
          docs={datos.docs}
          abierto={abierto}
          setAbierto={setAbierto}
          pendiente={pendiente}
          correr={correr}
          setError={setError}
          setAviso={setAviso}
          startTransition={startTransition}
          onRefresh={() => router.refresh()}
        />
      )}

      {tab === "reserva" && (
        <NuevaReserva
          leads={datos.leads}
          condicionesBase={condicionesBase}
          pendiente={pendiente}
          onEmitir={(f) =>
            correr(
              () => emitirReservaAction(f),
              (r) => {
                setTab("emitidos");
                setAbierto(String(r.id));
                return `Reserva ${String(r.numero)} emitida. Ahora podés enviarla por mail o WhatsApp.`;
              }
            )
          }
        />
      )}

      {tab === "libre" && (
        <LibreDeuda
          datos={datos}
          pendiente={pendiente}
          onEmitir={(origen, id) =>
            correr(
              () => emitirLibreDeudaAction({ origen, id }),
              (r) => {
                setTab("emitidos");
                setAbierto(String(r.id));
                return `Certificado ${String(r.numero)} emitido. Ahora podés enviarlo por mail o WhatsApp.`;
              }
            )
          }
        />
      )}
    </div>
  );
}

/* ───────────── Emitidos ───────────── */

function Emitidos({
  docs,
  abierto,
  setAbierto,
  pendiente,
  correr,
  setError,
  setAviso,
  startTransition,
  onRefresh,
}: {
  docs: Doc[];
  abierto: string | null;
  setAbierto: (id: string | null) => void;
  pendiente: boolean;
  correr: (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, ok: (r: Record<string, unknown>) => string | null) => void;
  setError: (e: string | null) => void;
  setAviso: (e: string | null) => void;
  startTransition: (cb: () => Promise<void>) => void;
  onRefresh: () => void;
}) {
  const [buscar, setBuscar] = useState("");
  const [envio, setEnvio] = useState<{ id: string; mensaje: string; adjuntar: boolean; dias: number } | null>(null);
  const [wa, setWa] = useState<{ id: string; url: string; link: string } | null>(null);
  const filtrados = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return q ? docs.filter((d) => `${d.numero} ${d.clienteNombre} ${d.clienteEmail ?? ""}`.toLowerCase().includes(q)) : docs;
  }, [docs, buscar]);

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      return true;
    } catch {
      window.prompt("Copiá el enlace:", texto);
      return false;
    }
  };

  if (!docs.length) return <p className="rounded-xl bg-white p-6 text-center text-sm text-brand-black/60 shadow-sm">Todavía no emitiste documentos.</p>;

  return (
    <div className="space-y-3">
      <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por número, cliente o email" className={input} />
      {filtrados.map((d) => {
        const estado = estadoEfectivo(d);
        const activo = estado !== "anulado";
        const linksActivos = d.links.filter((l) => !l.revocadoEn && new Date(l.venceEn).getTime() > Date.now());
        const resumen =
          d.tipo === "reserva"
            ? `${(d.datos as DatosReserva).inmueble} · reserva ${monto((d.datos as DatosReserva).importeReserva, (d.datos as DatosReserva).monedaReserva)}`
            : `${(d.datos as DatosLibreDeuda).inmueble}`;
        return (
          <div key={d.id} className="rounded-xl bg-white shadow-sm">
            <button type="button" onClick={() => setAbierto(abierto === d.id ? null : d.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-brand-black">
                  {d.numero} · {d.clienteNombre}
                </p>
                <p className="truncate text-xs text-brand-black/60">
                  {NOMBRE_TIPO[d.tipo]} · {fechaAr(d.emitidoEn)} · {resumen}
                </p>
              </div>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${CLASE_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
                {d.tipo === "reserva" && (
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      d.pagoEstado === "abonado" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {d.pagoEstado === "abonado" ? "💰 Abonado" : "Pago pendiente"}
                  </span>
                )}
              </span>
            </button>

            {abierto === d.id && (
              <div className="space-y-4 border-t border-black/5 p-4">
                <div className="flex flex-wrap gap-1.5">
                  <a href={`/api/admin/documentos-clientes/${d.id}/pdf`} target="_blank" rel="noopener noreferrer" className={`${btn} bg-black/5`}>
                    Ver PDF
                  </a>
                  {activo && (
                    <>
                      <button
                        type="button"
                        disabled={pendiente || !d.clienteEmail}
                        title={d.clienteEmail ? undefined : "El documento no tiene email del cliente"}
                        onClick={() => setEnvio({ id: d.id, mensaje: "", adjuntar: true, dias: 30 })}
                        className={`${btn} bg-brand-black text-white`}
                      >
                        {d.eventos.some((e) => e.tipo === "email_enviado") ? "Reenviar por email" : "Enviar por email"}
                      </button>
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          startTransition(async () => {
                            setError(null);
                            const r = await whatsappDocAction(d.id, 30);
                            if (!r.ok) return setError(r.error);
                            setWa({ id: d.id, url: r.url, link: r.link });
                            onRefresh();
                          })
                        }
                        className={`${btn} bg-[#25d366] text-white`}
                      >
                        Enviar por WhatsApp
                      </button>
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          startTransition(async () => {
                            setError(null);
                            const r = await nuevoLinkDocAction(d.id, 30);
                            if (!r.ok) return setError(r.error);
                            const ok = await copiar(r.link);
                            setAviso(`${ok ? "Enlace copiado" : "Enlace nuevo"} (vence el ${fechaAr(r.venceEn)}):\n${r.link}`);
                            onRefresh();
                          })
                        }
                        className={`${btn} border border-black/10`}
                      >
                        Copiar enlace nuevo
                      </button>
                      {linksActivos.length > 0 && (
                        <button
                          type="button"
                          disabled={pendiente}
                          onClick={() =>
                            confirm(`¿Revocar los ${linksActivos.length} enlaces activos? El cliente no va a poder entrar hasta que le mandes uno nuevo.`) &&
                            correr(() => revocarTodosLinksAction(d.id), (r) => `${String(r.cantidad)} enlace(s) revocado(s).`)
                          }
                          className={`${btn} border border-amber-300 text-amber-800`}
                        >
                          Revocar enlaces
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() => {
                          const motivo = window.prompt(`¿Anular ${d.numero}? Se revocan sus enlaces y la verificación pública lo va a mostrar como ANULADO.\n\nMotivo:`);
                          if (motivo === null) return;
                          correr(() => anularDocAction(d.id, motivo), () => `${d.numero} anulado.`);
                        }}
                        className={`${btn} text-red-600`}
                      >
                        Anular
                      </button>
                    </>
                  )}
                </div>

                {envio?.id === d.id && (
                  <div className="space-y-2 rounded-lg border border-black/10 p-3">
                    <p className="text-xs text-brand-black/60">
                      Para: <b>{d.clienteEmail}</b> · Asunto: Documentación de su operación inmobiliaria – DE NUNZIO NEGOCIOS INMOBILIARIOS
                    </p>
                    <Campo label="Mensaje personalizado (opcional)">
                      <textarea value={envio.mensaje} onChange={(e) => setEnvio({ ...envio, mensaje: e.target.value })} rows={3} className={input} />
                    </Campo>
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <label className="flex items-center gap-1.5">
                        <input type="checkbox" checked={envio.adjuntar} onChange={(e) => setEnvio({ ...envio, adjuntar: e.target.checked })} />
                        Adjuntar PDF
                      </label>
                      <label className="flex items-center gap-1.5">
                        El enlace vence en
                        <select value={envio.dias} onChange={(e) => setEnvio({ ...envio, dias: Number(e.target.value) })} className="rounded border border-black/10 px-1 py-0.5">
                          <option value={7}>7 días</option>
                          <option value={30}>30 días</option>
                          <option value={90}>90 días</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={pendiente}
                        onClick={() =>
                          correr(
                            () => enviarEmailDocAction(d.id, { mensaje: envio.mensaje, adjuntar: envio.adjuntar, dias: envio.dias }),
                            (r) => {
                              setEnvio(null);
                              return String(r.aviso);
                            }
                          )
                        }
                        className={`${btn} bg-brand-black text-white`}
                      >
                        {pendiente ? "Enviando…" : "Enviar"}
                      </button>
                      <button type="button" onClick={() => setEnvio(null)} className={`${btn} text-brand-black/60`}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {wa?.id === d.id && (
                  <div className="space-y-2 rounded-lg border border-[#25d366]/40 bg-[#25d366]/5 p-3 text-xs">
                    <p>Mensaje listo con el enlace privado{d.clienteTelefono ? ` para ${d.clienteTelefono}` : ""}.</p>
                    <a href={wa.url} target="_blank" rel="noopener noreferrer" className={`${btn} bg-[#25d366] text-white`}>
                      Abrir WhatsApp
                    </a>
                    <p className="break-all text-brand-black/50">{wa.link}</p>
                  </div>
                )}

                {d.tipo === "reserva" && (
                  <div className={`rounded-lg p-3 text-xs ${d.pagoEstado === "abonado" ? "bg-emerald-50" : "bg-amber-50"}`}>
                    <p className="font-semibold">
                      Pago de la reserva ({monto((d.datos as DatosReserva).importeReserva, (d.datos as DatosReserva).monedaReserva)}):{" "}
                      {d.pagoEstado === "abonado"
                        ? `abonado${d.pagoEn ? ` el ${fechaAr(d.pagoEn, true)}` : ""}${d.pagoMedio ? ` · ${d.pagoMedio === "mercadopago" ? "Mercado Pago" : d.pagoMedio}` : ""}`
                        : "pendiente"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {d.pagoEstado !== "abonado" && activo && (
                        <>
                          {(d.datos as DatosReserva).monedaReserva === "ARS" ? (
                            <button
                              type="button"
                              disabled={pendiente}
                              onClick={() =>
                                startTransition(async () => {
                                  setError(null);
                                  const r = await generarLinkPagoAction(d.id);
                                  if (!r.ok) return setError(r.error);
                                  const ok = await copiar(r.link);
                                  setAviso(`${ok ? "Link de pago copiado" : "Link de pago"}:\n${r.link}`);
                                  onRefresh();
                                })
                              }
                              className={`${btn} bg-[#009ee3] text-white`}
                            >
                              Copiar link de Mercado Pago
                            </button>
                          ) : (
                            <span className="text-brand-black/60">Reserva en dólares: Mercado Pago solo cobra en pesos.</span>
                          )}
                          {(["transferencia", "efectivo"] as const).map((medio) => (
                            <button
                              key={medio}
                              type="button"
                              disabled={pendiente}
                              onClick={() =>
                                confirm(`¿Marcar la reserva ${d.numero} como abonada por ${medio}?`) &&
                                correr(() => marcarPagoReservaAction(d.id, "abonado", medio), () => "Pago registrado.")
                              }
                              className={`${btn} border border-emerald-600 text-emerald-700`}
                            >
                              Abonó por {medio}
                            </button>
                          ))}
                        </>
                      )}
                      {d.pagoEstado === "abonado" && d.pagoMedio !== "mercadopago" && (
                        <button
                          type="button"
                          disabled={pendiente}
                          onClick={() =>
                            confirm("¿Volver el pago a pendiente?") && correr(() => marcarPagoReservaAction(d.id, "pendiente"), () => "Pago vuelto a pendiente.")
                          }
                          className={`${btn} text-brand-black/60`}
                        >
                          Volver a pendiente
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="inline text-brand-black/50">Cliente: </dt>
                    <dd className="inline">
                      {d.clienteNombre}
                      {d.clienteDni ? ` · DNI ${d.clienteDni}` : ""}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-brand-black/50">Contacto: </dt>
                    <dd className="inline">{[d.clienteEmail, d.clienteTelefono].filter(Boolean).join(" · ") || "—"}</dd>
                  </div>
                  {d.tipo === "reserva" && (
                    <>
                      <div>
                        <dt className="inline text-brand-black/50">Válida hasta: </dt>
                        <dd className="inline">{fechaAr(d.venceEn)}</dd>
                      </div>
                      {textoHonorariosReserva(d.datos as DatosReserva) && (
                        <div>
                          <dt className="inline text-brand-black/50">Honorarios: </dt>
                          <dd className="inline">{textoHonorariosReserva(d.datos as DatosReserva)}</dd>
                        </div>
                      )}
                      <div>
                        <dt className="inline text-brand-black/50">Aceptación online: </dt>
                        <dd className="inline">{d.aceptaHabilitada ? "Habilitada" : "No"}</dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt className="inline text-brand-black/50">Verificación: </dt>
                    <dd className="inline">
                      <a href={`/verificar/${d.codigoVerificacion}`} target="_blank" rel="noopener noreferrer" className="font-mono underline">
                        {d.codigoVerificacion}
                      </a>
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="inline text-brand-black/50">Huella SHA-256: </dt>
                    <dd className="inline break-all font-mono text-[10px] text-brand-black/50">{d.pdfSha256}</dd>
                  </div>
                  {d.anuladoEn && (
                    <div className="sm:col-span-2 text-red-700">
                      Anulado el {fechaAr(d.anuladoEn, true)}
                      {d.anuladoMotivo ? `: ${d.anuladoMotivo}` : ""}
                    </div>
                  )}
                </dl>

                {d.decisiones.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-brand-black/50">Estado de aceptación</p>
                    {d.decisiones.map((x, i) => (
                      <div key={i} className={`rounded-lg p-2 text-xs ${x.decision === "aceptado" ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-900"}`}>
                        <b>{x.decision === "aceptado" ? "Aceptada" : "Rechazada"}</b> el {fechaAr(x.creadoEn, true)} hs · verificado por código a {x.email}
                        {x.ip ? ` · IP ${x.ip}` : ""} · versión {x.version}
                        {x.motivo ? ` · Motivo: ${x.motivo}` : ""}
                      </div>
                    ))}
                  </div>
                )}

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-brand-black/50">Enlaces privados</p>
                  {d.links.length === 0 ? (
                    <p className="text-xs text-brand-black/50">Todavía no se generó ninguno.</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {d.links.map((l) => {
                        const vencido = new Date(l.venceEn).getTime() < Date.now();
                        return (
                          <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-black/[0.03] px-2 py-1">
                            <span>
                              {CANAL[l.canal ?? ""] ?? l.canal} · {fechaAr(l.creadoEn, true)} · {l.accesos} acceso{l.accesos === 1 ? "" : "s"}
                              {l.ultimoAccesoEn ? ` (último ${fechaAr(l.ultimoAccesoEn, true)})` : ""} ·{" "}
                              {l.revocadoEn ? <b className="text-red-600">revocado</b> : vencido ? <b className="text-brand-black/50">vencido</b> : `vence ${fechaAr(l.venceEn)}`}
                            </span>
                            {!l.revocadoEn && !vencido && (
                              <button
                                type="button"
                                disabled={pendiente}
                                onClick={() => correr(() => revocarLinkAction(l.id), () => "Enlace revocado.")}
                                className="font-semibold text-red-600"
                              >
                                Revocar
                              </button>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold uppercase text-brand-black/50">Historial de comunicaciones</p>
                  <ul className="max-h-60 space-y-0.5 overflow-y-auto text-xs">
                    {d.eventos.map((e) => (
                      <li key={e.id} className="flex gap-2">
                        <span className="shrink-0 text-brand-black/40">{fechaAr(e.creadoEn, true)}</span>
                        <span>
                          {EVENTO[e.tipo] ?? e.tipo}
                          {typeof e.detalle.a === "string" && e.detalle.a ? ` · ${e.detalle.a}` : ""}
                          {typeof e.detalle.error === "string" ? ` · ${e.detalle.error}` : ""}
                          {e.actor && e.actor !== "cliente" && e.actor !== "sistema" ? <span className="text-brand-black/40"> · {e.actor}</span> : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ───────────── Nueva reserva ───────────── */

function NuevaReserva({
  leads,
  condicionesBase,
  pendiente,
  onEmitir,
}: {
  leads: CandidatoLead[];
  condicionesBase: string;
  pendiente: boolean;
  onEmitir: (f: Record<string, string>) => void;
}) {
  const vacio = {
    leadId: "",
    clienteNombre: "",
    clienteDni: "",
    clienteEmail: "",
    clienteTelefono: "",
    inmueble: "",
    valorVenta: "",
    monedaVenta: "USD",
    importeReserva: "",
    monedaReserva: "ARS",
    formaPagoSaldo: "",
    honorariosPct: "3",
    venceEn: sumarDias(hoyAr(), 7),
    condiciones: condicionesBase,
    aceptaHabilitada: "1",
  };
  const [f, setF] = useState(vacio);
  const [buscar, setBuscar] = useState("");
  const set = (k: keyof typeof vacio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF({ ...f, [k]: e.target.value });
  const opciones = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return (q ? leads.filter((l) => `${l.nombre} ${l.email ?? ""} ${l.telefono ?? ""} ${l.inmueble}`.toLowerCase().includes(q)) : leads).slice(0, 50);
  }, [leads, buscar]);

  const elegir = (id: string) => {
    const l = leads.find((x) => x.id === id);
    if (!l) return setF({ ...f, leadId: "" });
    setF({
      ...f,
      leadId: l.id,
      clienteNombre: l.nombre,
      clienteDni: l.dni ?? "",
      clienteEmail: l.email ?? "",
      clienteTelefono: l.telefono ?? "",
      inmueble: l.inmueble || f.inmueble,
      valorVenta: l.precioUsd ? String(l.precioUsd) : f.valorVenta,
    });
  };

  return (
    <form
      className="grid gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (confirm(`¿Emitir la reserva de ${f.clienteNombre}? Se le asigna número y se genera el PDF definitivo (no se puede editar después, solo anular).`))
          onEmitir(f);
      }}
    >
      <div className="space-y-2 rounded-lg bg-black/[0.03] p-3 sm:col-span-2">
        <Campo label="Traer datos de un cliente del CRM (opcional)">
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, email, teléfono o lote" className={input} />
        </Campo>
        <select value={f.leadId} onChange={(e) => elegir(e.target.value)} className={input}>
          <option value="">— Sin vincular a un cliente del CRM —</option>
          {opciones.map((l) => (
            <option key={l.id} value={l.id}>
              {l.nombre}
              {l.inmueble ? ` · ${l.inmueble}` : ""}
            </option>
          ))}
        </select>
      </div>
      <Campo label="Nombre y apellido *">
        <input value={f.clienteNombre} onChange={set("clienteNombre")} required className={input} />
      </Campo>
      <Campo label="DNI">
        <input value={f.clienteDni} onChange={set("clienteDni")} className={input} />
      </Campo>
      <Campo label={`Email ${f.aceptaHabilitada === "1" ? "* (le llega el código para aceptar)" : ""}`}>
        <input type="email" value={f.clienteEmail} onChange={set("clienteEmail")} required={f.aceptaHabilitada === "1"} className={input} />
      </Campo>
      <Campo label="Teléfono (WhatsApp)">
        <input value={f.clienteTelefono} onChange={set("clienteTelefono")} className={input} />
      </Campo>
      <Campo label="Inmueble *" className="sm:col-span-2">
        <input value={f.inmueble} onChange={set("inmueble")} required placeholder="Ej: Lote 12 – Manzana 4, Las Liebres - San Vicente" className={input} />
      </Campo>
      <Campo label="Valor de venta">
        <div className="flex gap-1">
          <select value={f.monedaVenta} onChange={set("monedaVenta")} className="rounded-lg border border-black/10 px-2 text-sm">
            <option value="USD">USD</option>
            <option value="ARS">$</option>
          </select>
          <input value={f.valorVenta} onChange={set("valorVenta")} inputMode="decimal" className={input} />
        </div>
      </Campo>
      <Campo label="Importe de la reserva *">
        <div className="flex gap-1">
          <select value={f.monedaReserva} onChange={set("monedaReserva")} className="rounded-lg border border-black/10 px-2 text-sm">
            <option value="ARS">$</option>
            <option value="USD">USD</option>
          </select>
          <input value={f.importeReserva} onChange={set("importeReserva")} required inputMode="decimal" className={input} />
        </div>
      </Campo>
      <Campo label="Forma de pago del saldo">
        <input value={f.formaPagoSaldo} onChange={set("formaPagoSaldo")} placeholder="Ej: anticipo USD 900 y 24 cuotas de USD 390" className={input} />
      </Campo>
      <Campo
        label={`Honorarios profesionales (% sobre el total de la operación)${
          f.honorariosPct && f.valorVenta
            ? ` = ${monto((Number(f.valorVenta.replace(/\./g, "").replace(",", ".")) * Number(f.honorariosPct.replace(",", "."))) / 100, f.monedaVenta as "USD" | "ARS")}`
            : ""
        }`}
      >
        <input value={f.honorariosPct} onChange={set("honorariosPct")} inputMode="decimal" className={input} />
      </Campo>
      <Campo label="Válida hasta *">
        <input type="date" value={f.venceEn} min={hoyAr()} onChange={set("venceEn")} required className={input} />
      </Campo>
      <Campo label="Condiciones (salen en el PDF)" className="sm:col-span-2">
        <textarea value={f.condiciones} onChange={set("condiciones")} rows={7} className={input} />
      </Campo>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input
          type="checkbox"
          checked={f.aceptaHabilitada === "1"}
          onChange={(e) => setF({ ...f, aceptaHabilitada: e.target.checked ? "1" : "0" })}
          className="mt-1"
        />
        <span>
          Permitir que el cliente <b>acepte o rechace</b> la reserva desde su enlace (verificando con un código por mail).
        </span>
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pendiente} className="rounded-lg bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pendiente ? "Emitiendo…" : "Emitir reserva"}
        </button>
      </div>
    </form>
  );
}

/* ───────────── Libre deuda ───────────── */

function LibreDeuda({
  datos,
  pendiente,
  onEmitir,
}: {
  datos: DatosPanelDocs;
  pendiente: boolean;
  onEmitir: (origen: "lote" | "alquiler", id: string) => void;
}) {
  const financiados = datos.leads.filter((l) => l.cuotas.total > 0);
  return (
    <div className="space-y-4">
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-brand-black">Lotes financiados</p>
        <p className="mb-2 text-xs text-brand-black/60">Se emite si no tiene cuotas vencidas sin pagar. Si pagó todas, el certificado dice que canceló el plan.</p>
        {financiados.length === 0 && <p className="text-xs text-brand-black/50">No hay clientes con cuotas generadas.</p>}
        <ul className="divide-y divide-black/5">
          {financiados.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
              <div>
                <p className="font-medium">{l.nombre}</p>
                <p className="text-xs text-brand-black/60">
                  {l.inmueble || "—"} · {l.cuotas.pagadas} de {l.cuotas.total} cuotas pagas
                  {l.cuotas.vencidasImpagas > 0 && <b className="text-red-600"> · {l.cuotas.vencidasImpagas} vencida(s) impaga(s)</b>}
                </p>
              </div>
              <button
                type="button"
                disabled={pendiente || l.cuotas.vencidasImpagas > 0}
                onClick={() => confirm(`¿Emitir certificado de libre deuda para ${l.nombre}?`) && onEmitir("lote", l.id)}
                className={`${btn} bg-brand-black text-white`}
              >
                {l.cuotas.pagadas === l.cuotas.total ? "Emitir (plan cancelado)" : "Emitir (al día)"}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p className="text-sm font-bold text-brand-black">Alquileres</p>
        <p className="mb-2 text-xs text-brand-black/60">Se emite al inquilino si no tiene meses ni servicios a su cargo vencidos sin pagar.</p>
        {datos.alquileres.length === 0 && <p className="text-xs text-brand-black/50">No hay contratos activos.</p>}
        <ul className="divide-y divide-black/5">
          {datos.alquileres.map((c) => {
            const bloqueado = c.vencidasImpagas > 0 || c.serviciosImpagos > 0;
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <div>
                  <p className="font-medium">{c.direccion}</p>
                  <p className="text-xs text-brand-black/60">
                    Inquilino: {c.inquilino}
                    {c.vencidasImpagas > 0 && <b className="text-red-600"> · {c.vencidasImpagas} mes(es) vencido(s)</b>}
                    {c.serviciosImpagos > 0 && <b className="text-red-600"> · {c.serviciosImpagos} servicio(s) impago(s)</b>}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pendiente || bloqueado}
                  onClick={() => confirm(`¿Emitir certificado de libre deuda para ${c.inquilino}?`) && onEmitir("alquiler", c.id)}
                  className={`${btn} bg-brand-black text-white`}
                >
                  Emitir
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
