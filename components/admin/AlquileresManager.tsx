"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Copy, FileText, Link2, MessageCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  CONCEPTOS_SERVICIO,
  diasParaVencer,
  estadoCuota,
  fechaCorta,
  formatoMonto,
  hoyIso,
  nombrePeriodo,
  punitoriosCalculados,
  totalCuota,
  type ContratoAlq,
  type CuotaAlq,
  type LiquidacionAlq,
  type PersonaAlq,
  type ServicioAlq,
} from "@/lib/alquileres";
import {
  ajustarMontoContratoAction,
  anularPagoAlqAction,
  crearLiquidacionAction,
  editarCuotaAlqAction,
  eliminarContratoAlqAction,
  eliminarLiquidacionAction,
  eliminarPersonaAlqAction,
  eliminarServicioAlqAction,
  guardarContratoAlqAction,
  guardarPersonaAlqAction,
  guardarServicioAlqAction,
  linkPagoAlqAction,
  marcarLiquidacionPagadaAction,
  marcarServicioPagadoAction,
  registrarPagoAlqAction,
  renovarLinkPersonaAction,
} from "@/lib/admin/alquileres-actions";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";

type Datos = {
  personas: PersonaAlq[];
  contratos: ContratoAlq[];
  cuotas: CuotaAlq[];
  servicios: ServicioAlq[];
  liquidaciones: LiquidacionAlq[];
};

type Tab = "resumen" | "cobros" | "contratos" | "personas" | "servicios" | "liquidaciones";
const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "cobros", label: "Cobros" },
  { id: "contratos", label: "Contratos" },
  { id: "personas", label: "Propietarios e inquilinos" },
  { id: "servicios", label: "Expensas y servicios" },
  { id: "liquidaciones", label: "Liquidaciones" },
];

const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const btn = "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50";

const ESTADO_CUOTA: Record<string, { t: string; c: string }> = {
  pagada: { t: "Pagado", c: "bg-emerald-100 text-emerald-800" },
  vencida: { t: "Vencido", c: "bg-red-100 text-red-800" },
  por_vencer: { t: "Por vencer", c: "bg-amber-100 text-amber-800" },
  futura: { t: "Próximo", c: "bg-slate-100 text-slate-700" },
};

function Campo({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`block text-xs font-medium text-brand-black/70 ${className}`}>
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Modal({ titulo, onClose, children }: { titulo: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold text-brand-black">{titulo}</h3>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-brand-black/50">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AlquileresManager({ datos, sitio }: { datos: Datos; sitio: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumen");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();
  const hoy = hoyIso();

  const persona = useMemo(() => new Map(datos.personas.map((p) => [p.id, p])), [datos.personas]);
  const contrato = useMemo(() => new Map(datos.contratos.map((c) => [c.id, c])), [datos.contratos]);
  const linkPortal = (p?: PersonaAlq) => (p ? `${sitio}/mi-alquiler/${p.token}` : "");

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, ok?: string, despues?: () => void) =>
    startTransition(async () => {
      setError(null);
      setAviso(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No se pudo guardar.");
      else {
        if (ok) setAviso(ok);
        despues?.();
        router.refresh();
      }
    });

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Link copiado.");
    } catch {
      window.prompt("Copiá el link:", texto);
    }
  };

  // Modales
  const [personaEdit, setPersonaEdit] = useState<Partial<PersonaAlq> | null>(null);
  const [contratoEdit, setContratoEdit] = useState<Partial<ContratoAlq> | null>(null);
  const [ajuste, setAjuste] = useState<ContratoAlq | null>(null);
  const [cobro, setCobro] = useState<CuotaAlq | null>(null);
  const [cuotaEdit, setCuotaEdit] = useState<CuotaAlq | null>(null);
  const [servicioEdit, setServicioEdit] = useState<Partial<ServicioAlq> | null>(null);
  const [liquidar, setLiquidar] = useState<ContratoAlq | null>(null);

  const activos = datos.contratos.filter((c) => c.estado === "activo");

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${tab === t.id ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{aviso}</p>}

      {tab === "resumen" && (
        <Resumen datos={datos} hoy={hoy} contrato={contrato} persona={persona} onIr={setTab} onCobrar={setCobro} />
      )}

      {tab === "cobros" && (
        <Cobros
          datos={datos}
          hoy={hoy}
          contrato={contrato}
          persona={persona}
          sitio={sitio}
          onCobrar={setCobro}
          onEditar={setCuotaEdit}
          onAnular={(c) => confirm("¿Anular este cobro?") && correr(() => anularPagoAlqAction(c.id), "Cobro anulado.")}
          onLinkMp={(c) =>
            startTransition(async () => {
              setError(null);
              const r = await linkPagoAlqAction(c.id);
              if (!r.ok) return setError(r.error);
              const ct = contrato.get(c.contratoId);
              const inq = ct ? persona.get(ct.inquilinoId) : undefined;
              if (inq?.telefono) {
                window.open(
                  buildWhatsappClienteUrl(
                    inq.telefono,
                    `Hola ${inq.nombre.split(" ")[0]}! Te paso el link para pagar el alquiler de ${nombrePeriodo(c.periodo)} (${ct?.direccion}) con Mercado Pago: ${r.url}`
                  ),
                  "_blank"
                );
              } else await copiar(r.url);
              router.refresh();
            })
          }
        />
      )}

      {tab === "contratos" && (
        <div className="space-y-3">
          <div className="flex justify-between gap-2">
            <p className="text-sm text-brand-black/60">{activos.length} contratos activos</p>
            <button
              type="button"
              onClick={() => (datos.personas.length < 2 ? setError("Primero cargá al propietario y al inquilino en la pestaña Propietarios e inquilinos.") : setContratoEdit({}))}
              className={`${btn} bg-brand-black text-white`}
            >
              <Plus className="h-3.5 w-3.5" /> Nuevo contrato
            </button>
          </div>
          {datos.contratos.length === 0 && <Vacio texto="Todavía no hay contratos. Cargá primero al propietario y al inquilino, y después el contrato." />}
          {datos.contratos.map((c) => {
            const prop = persona.get(c.propietarioId);
            const inq = persona.get(c.inquilinoId);
            const cuotas = datos.cuotas.filter((q) => q.contratoId === c.id);
            const deuda = cuotas.filter((q) => !q.pagadoEn && q.vencimiento < hoy).reduce((s, q) => s + totalCuota(q, c, hoy), 0);
            const sinLiquidar = cuotas.filter((q) => q.pagadoEn && !q.liquidacionId).reduce((s, q) => s + (q.pagadoMonto ?? 0), 0);
            const vence = diasParaVencer(c.fechaFin, hoy);
            return (
              <div key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-brand-black">{c.direccion}</p>
                    <p className="text-xs text-brand-black/60">
                      {c.localidad ? `${c.localidad} · ` : ""}Propietario: {prop?.nombre ?? "—"} · Inquilino: {inq?.nombre ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-brand-black/60">
                      {formatoMonto(c.montoActual, c.moneda)} por mes · vence el día {c.diaVencimiento} · comisión {c.comisionAdminPct}% · {fechaCorta(c.fechaInicio)} al{" "}
                      {fechaCorta(c.fechaFin)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {c.estado !== "activo" && <Chip c="bg-slate-100 text-slate-700">{c.estado}</Chip>}
                      {c.estado === "activo" && vence <= 90 && <Chip c="bg-amber-100 text-amber-800">{vence < 0 ? "Contrato vencido" : `Vence en ${vence} días`}</Chip>}
                      {c.proximoAjuste && diasParaVencer(c.proximoAjuste, hoy) <= 30 && (
                        <Chip c="bg-violet-100 text-violet-800">Ajuste {fechaCorta(c.proximoAjuste)}</Chip>
                      )}
                      {deuda > 0 && <Chip c="bg-red-100 text-red-800">Debe {formatoMonto(deuda, c.moneda)}</Chip>}
                      {sinLiquidar > 0 && <Chip c="bg-sky-100 text-sky-800">Sin liquidar {formatoMonto(sinLiquidar, c.moneda)}</Chip>}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" onClick={() => setAjuste(c)} className={`${btn} bg-violet-600 text-white`}>
                      Ajustar monto
                    </button>
                    <button type="button" onClick={() => setLiquidar(c)} className={`${btn} bg-sky-700 text-white`}>
                      Liquidar
                    </button>
                    <button type="button" onClick={() => setContratoEdit(c)} className={`${btn} bg-black/5 text-brand-black`}>
                      <Pencil className="h-3.5 w-3.5" /> Editar
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-black/5 pt-3">
                  {[inq, prop].map(
                    (p) =>
                      p && (
                        <div key={p.id} className="flex items-center gap-1 rounded-lg bg-black/[0.03] px-2 py-1 text-xs">
                          <span className="text-brand-black/60">Link {p.tipo}:</span>
                          <button type="button" onClick={() => copiar(linkPortal(p))} className="font-semibold text-brand-green-700" title="Copiar">
                            <Copy className="inline h-3 w-3" /> Copiar
                          </button>
                          {p.telefono && (
                            <a
                              href={buildWhatsappClienteUrl(
                                p.telefono,
                                `Hola ${p.nombre.split(" ")[0]}! Desde este link podés ver ${p.tipo === "inquilino" ? "tu alquiler, los pagos, la próxima cuota y descargar los recibos" : "los cobros y las liquidaciones de tu propiedad"}: ${linkPortal(p)}`
                              )}
                              target="_blank"
                              rel="noopener"
                              className="font-semibold text-emerald-700"
                            >
                              <MessageCircle className="inline h-3 w-3" /> Enviar
                            </a>
                          )}
                        </div>
                      )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "personas" && (
        <div className="space-y-3">
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setPersonaEdit({ tipo: "propietario" })} className={`${btn} bg-brand-black text-white`}>
              <Plus className="h-3.5 w-3.5" /> Propietario
            </button>
            <button type="button" onClick={() => setPersonaEdit({ tipo: "inquilino" })} className={`${btn} bg-brand-black text-white`}>
              <Plus className="h-3.5 w-3.5" /> Inquilino
            </button>
          </div>
          {datos.personas.length === 0 && <Vacio texto="Cargá a los propietarios e inquilinos para después armar los contratos." />}
          {(["propietario", "inquilino"] as const).map((tipo) => {
            const lista = datos.personas.filter((p) => p.tipo === tipo);
            if (!lista.length) return null;
            return (
              <div key={tipo} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="mb-2 text-xs font-semibold uppercase text-brand-black/50">{tipo === "propietario" ? "Propietarios" : "Inquilinos"}</p>
                <ul className="divide-y divide-black/5">
                  {lista.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <div>
                        <p className="font-semibold text-brand-black">{p.nombre}</p>
                        <p className="text-xs text-brand-black/60">{[p.dni && `DNI ${p.dni}`, p.telefono, p.email, p.cbuAlias && `CBU/alias ${p.cbuAlias}`].filter(Boolean).join(" · ")}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button type="button" onClick={() => copiar(linkPortal(p))} className={`${btn} bg-black/5`}>
                          <Link2 className="h-3.5 w-3.5" /> Link
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm("Se genera un link nuevo y el anterior deja de funcionar. ¿Seguir?") && correr(() => renovarLinkPersonaAction(p.id), "Link renovado.")}
                          className={`${btn} bg-black/5`}
                        >
                          Renovar link
                        </button>
                        <button type="button" onClick={() => setPersonaEdit(p)} className={`${btn} bg-black/5`}>
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => confirm(`¿Borrar a ${p.nombre}?`) && correr(() => eliminarPersonaAlqAction(p.id), "Borrado.")}
                          className={`${btn} text-red-600`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {tab === "servicios" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => (activos.length ? setServicioEdit({ aCargo: "inquilino", concepto: "Expensas" }) : setError("Primero cargá un contrato."))}
              className={`${btn} bg-brand-black text-white`}
            >
              <Plus className="h-3.5 w-3.5" /> Cargar gasto o servicio
            </button>
          </div>
          {datos.servicios.length === 0 && <Vacio texto="Acá llevás expensas, ABL, ARBA, luz, gas y agua de cada propiedad: quién los paga y si están al día." />}
          {datos.servicios.length > 0 && (
            <div className="overflow-x-auto rounded-xl bg-white shadow-sm">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left text-xs uppercase text-brand-black/50">
                    <th className="p-3">Propiedad</th>
                    <th className="p-3">Concepto</th>
                    <th className="p-3">A cargo</th>
                    <th className="p-3">Vence</th>
                    <th className="p-3 text-right">Monto</th>
                    <th className="p-3">Estado</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {datos.servicios.map((s) => {
                    const c = contrato.get(s.contratoId);
                    const vencido = !s.pagado && s.vencimiento && s.vencimiento < hoy;
                    return (
                      <tr key={s.id} className="border-b border-black/5">
                        <td className="p-3">{c?.direccion ?? "—"}</td>
                        <td className="p-3">
                          {s.concepto}
                          {s.periodo ? <span className="text-brand-black/50"> · {nombrePeriodo(s.periodo)}</span> : null}
                        </td>
                        <td className="p-3 capitalize">{s.aCargo}</td>
                        <td className="p-3">{fechaCorta(s.vencimiento)}</td>
                        <td className="p-3 text-right">{s.monto !== null && c ? formatoMonto(s.monto, c.moneda) : "—"}</td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => correr(() => marcarServicioPagadoAction(s.id, !s.pagado))}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.pagado ? "bg-emerald-100 text-emerald-800" : vencido ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
                          >
                            {s.pagado ? "Pagado" : vencido ? "Vencido" : "Pendiente"}
                          </button>
                        </td>
                        <td className="p-3 text-right">
                          <button type="button" onClick={() => setServicioEdit(s)} className="mr-2 text-brand-black/50">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => confirm("¿Borrar?") && correr(() => eliminarServicioAlqAction(s.id))} className="text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "liquidaciones" && (
        <div className="space-y-3">
          <p className="text-sm text-brand-black/60">
            Para liquidar, andá a <b>Contratos</b> → <b>Liquidar</b>: toma lo cobrado que todavía no se le rindió al propietario y descuenta tu comisión y los gastos.
          </p>
          {datos.liquidaciones.length === 0 && <Vacio texto="Todavía no hay liquidaciones." />}
          {datos.liquidaciones.map((l) => {
            const c = contrato.get(l.contratoId);
            const prop = persona.get(l.propietarioId);
            const pdf = `/api/alquileres/liquidacion/${l.id}`;
            return (
              <div key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-4 shadow-sm">
                <div className="text-sm">
                  <p className="font-semibold text-brand-black">
                    {prop?.nombre} · {c?.direccion}
                  </p>
                  <p className="text-xs text-brand-black/60">
                    Cobrado {c && formatoMonto(l.cobrado, c.moneda)} − comisión {c && formatoMonto(l.comision, c.moneda)}
                    {l.gastos ? ` − gastos ${c && formatoMonto(l.gastos, c.moneda)}` : ""} = <b>neto {c && formatoMonto(l.neto, c.moneda)}</b>
                  </p>
                  <p className="text-xs text-brand-black/50">{l.notas}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Chip c={l.pagadaEn ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}>{l.pagadaEn ? `Pagada ${fechaCorta(l.pagadaEn)}` : "A pagar"}</Chip>
                  <a href={pdf} target="_blank" className={`${btn} bg-black/5`}>
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </a>
                  {prop?.telefono && (
                    <a
                      href={buildWhatsappClienteUrl(
                        prop.telefono,
                        `Hola ${prop.nombre.split(" ")[0]}! Te paso la liquidación del alquiler de ${c?.direccion}: neto ${c ? formatoMonto(l.neto, c.moneda) : ""}. Detalle: ${sitio}${pdf}?t=${prop.token}`
                      )}
                      target="_blank"
                      rel="noopener"
                      className={`${btn} bg-emerald-600 text-white`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Enviar
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (l.pagadaEn) return correr(() => marcarLiquidacionPagadaAction(l.id, false, ""));
                      const medio = window.prompt("¿Cómo se le pagó al propietario? (transferencia, efectivo…)", "transferencia");
                      if (medio !== null) correr(() => marcarLiquidacionPagadaAction(l.id, true, medio), "Liquidación marcada como pagada.");
                    }}
                    className={`${btn} bg-sky-700 text-white`}
                  >
                    {l.pagadaEn ? "Desmarcar pago" : "Marcar pagada"}
                  </button>
                  <button
                    type="button"
                    onClick={() => confirm("¿Borrar esta liquidación? Los cobros vuelven a quedar sin liquidar.") && correr(() => eliminarLiquidacionAction(l.id))}
                    className={`${btn} text-red-600`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ───── Modales ───── */}

      {personaEdit && (
        <Modal titulo={personaEdit.id ? "Editar" : personaEdit.tipo === "propietario" ? "Nuevo propietario" : "Nuevo inquilino"} onClose={() => setPersonaEdit(null)}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              correr(() => guardarPersonaAlqAction({ ...f, id: personaEdit.id ?? "", tipo: personaEdit.tipo ?? "inquilino" }), "Guardado.", () => setPersonaEdit(null));
            }}
          >
            <Campo label="Nombre y apellido *" className="sm:col-span-2">
              <input name="nombre" defaultValue={personaEdit.nombre} required className={input} />
            </Campo>
            <Campo label="DNI">
              <input name="dni" defaultValue={personaEdit.dni ?? ""} className={input} />
            </Campo>
            <Campo label="CUIT / CUIL">
              <input name="cuit" defaultValue={personaEdit.cuit ?? ""} className={input} />
            </Campo>
            <Campo label="WhatsApp">
              <input name="telefono" defaultValue={personaEdit.telefono ?? ""} className={input} />
            </Campo>
            <Campo label="Email">
              <input name="email" type="email" defaultValue={personaEdit.email ?? ""} className={input} />
            </Campo>
            <Campo label="Domicilio" className="sm:col-span-2">
              <input name="domicilio" defaultValue={personaEdit.domicilio ?? ""} className={input} />
            </Campo>
            {personaEdit.tipo === "propietario" && (
              <Campo label="CBU / alias para transferirle" className="sm:col-span-2">
                <input name="cbuAlias" defaultValue={personaEdit.cbuAlias ?? ""} className={input} />
              </Campo>
            )}
            <Campo label="Notas" className="sm:col-span-2">
              <textarea name="notas" defaultValue={personaEdit.notas ?? ""} rows={2} className={input} />
            </Campo>
            <Guardar pendiente={pendiente} />
          </form>
        </Modal>
      )}

      {contratoEdit && (
        <Modal titulo={contratoEdit.id ? "Editar contrato" : "Nuevo contrato"} onClose={() => setContratoEdit(null)}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              correr(() => guardarContratoAlqAction({ ...f, id: contratoEdit.id ?? "" }), "Contrato guardado. Los meses se generaron solos.", () => setContratoEdit(null));
            }}
          >
            <Campo label="Dirección de la propiedad *" className="sm:col-span-2">
              <input name="direccion" defaultValue={contratoEdit.direccion} required className={input} placeholder="Ej: Calle 108 N° 1234" />
            </Campo>
            <Campo label="Localidad">
              <input name="localidad" defaultValue={contratoEdit.localidad ?? ""} className={input} />
            </Campo>
            <Campo label="Estado">
              <select name="estado" defaultValue={contratoEdit.estado ?? "activo"} className={input}>
                <option value="activo">Activo</option>
                <option value="finalizado">Finalizado</option>
                <option value="rescindido">Rescindido</option>
              </select>
            </Campo>
            <Campo label="Propietario *">
              <select name="propietarioId" defaultValue={contratoEdit.propietarioId ?? ""} required className={input}>
                <option value="">Elegir…</option>
                {datos.personas
                  .filter((p) => p.tipo === "propietario")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
              </select>
            </Campo>
            <Campo label="Inquilino *">
              <select name="inquilinoId" defaultValue={contratoEdit.inquilinoId ?? ""} required className={input}>
                <option value="">Elegir…</option>
                {datos.personas
                  .filter((p) => p.tipo === "inquilino")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nombre}
                    </option>
                  ))}
              </select>
            </Campo>
            <Campo label="Garantes (nombre, DNI, teléfono, tipo de garantía)" className="sm:col-span-2">
              <textarea name="garantes" defaultValue={contratoEdit.garantes ?? ""} rows={2} className={input} />
            </Campo>
            <Campo label="Inicio *">
              <input type="date" name="fechaInicio" defaultValue={contratoEdit.fechaInicio} required className={input} />
            </Campo>
            <Campo label="Fin *">
              <input type="date" name="fechaFin" defaultValue={contratoEdit.fechaFin} required className={input} />
            </Campo>
            <Campo label="Alquiler mensual actual *">
              <input name="montoActual" inputMode="decimal" defaultValue={contratoEdit.montoActual ?? ""} required className={input} />
            </Campo>
            <Campo label="Moneda">
              <select name="moneda" defaultValue={contratoEdit.moneda ?? "ARS"} className={input}>
                <option value="ARS">Pesos</option>
                <option value="USD">Dólares</option>
              </select>
            </Campo>
            <Campo label="Día de vencimiento (1 a 28)">
              <input type="number" min={1} max={28} name="diaVencimiento" defaultValue={contratoEdit.diaVencimiento ?? 10} className={input} />
            </Campo>
            <Campo label="Comisión de administración (%)">
              <input name="comisionAdminPct" inputMode="decimal" defaultValue={contratoEdit.comisionAdminPct ?? 5} className={input} />
            </Campo>
            <Campo label="Interés por mora (% por día)">
              <input name="punitorioDiarioPct" inputMode="decimal" defaultValue={contratoEdit.punitorioDiarioPct ?? 0} className={input} />
            </Campo>
            <Campo label="Depósito en garantía">
              <input name="deposito" inputMode="decimal" defaultValue={contratoEdit.deposito ?? ""} className={input} />
            </Campo>
            <Campo label="Próximo ajuste">
              <input type="date" name="proximoAjuste" defaultValue={contratoEdit.proximoAjuste ?? ""} className={input} />
            </Campo>
            <Campo label="Cómo se ajusta (referencia)">
              <input name="ajusteDetalle" defaultValue={contratoEdit.ajusteDetalle ?? ""} placeholder="Ej: cada 3 meses, lo cargo a mano" className={input} />
            </Campo>
            <Campo label="Notas" className="sm:col-span-2">
              <textarea name="notas" defaultValue={contratoEdit.notas ?? ""} rows={2} className={input} />
            </Campo>
            <div className="flex items-center justify-between gap-2 sm:col-span-2">
              {contratoEdit.id ? (
                <button
                  type="button"
                  onClick={() =>
                    confirm("¿Borrar el contrato con todos sus cobros, servicios y liquidaciones? No se puede deshacer.") &&
                    correr(() => eliminarContratoAlqAction(contratoEdit.id!), "Contrato borrado.", () => setContratoEdit(null))
                  }
                  className={`${btn} text-red-600`}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Borrar contrato
                </button>
              ) : (
                <span />
              )}
              <button type="submit" disabled={pendiente} className="rounded-lg bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                {pendiente ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {ajuste && (
        <Modal titulo={`Ajustar alquiler · ${ajuste.direccion}`} onClose={() => setAjuste(null)}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              startTransition(async () => {
                setError(null);
                const r = await ajustarMontoContratoAction(ajuste.id, f.monto, `${f.desde}-01`, f.proximo, f.detalle);
                if (!r.ok) return setError(r.error);
                setAviso(`Nuevo monto aplicado a ${r.actualizados} mes(es) sin pagar.`);
                setAjuste(null);
                router.refresh();
              });
            }}
          >
            <p className="text-sm text-brand-black/60 sm:col-span-2">
              Monto actual: <b>{formatoMonto(ajuste.montoActual, ajuste.moneda)}</b>. El nuevo monto se aplica a los meses que todavía no se pagaron, desde el mes que elijas.
            </p>
            <Campo label="Nuevo monto mensual *">
              <input name="monto" inputMode="decimal" required className={input} />
            </Campo>
            <Campo label="Rige desde el mes *">
              <input type="month" name="desde" required defaultValue={hoy.slice(0, 7)} className={input} />
            </Campo>
            <Campo label="Próximo ajuste">
              <input type="date" name="proximo" className={input} />
            </Campo>
            <Campo label="Detalle">
              <input name="detalle" defaultValue={ajuste.ajusteDetalle ?? ""} className={input} />
            </Campo>
            <Guardar pendiente={pendiente} texto="Aplicar ajuste" />
          </form>
        </Modal>
      )}

      {cobro &&
        (() => {
          const c = contrato.get(cobro.contratoId)!;
          const sugerido = totalCuota(cobro, c, hoy);
          return (
            <Modal titulo={`Registrar cobro · ${nombrePeriodo(cobro.periodo)}`} onClose={() => setCobro(null)}>
              <form
                className="grid gap-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
                  startTransition(async () => {
                    setError(null);
                    const r = await registrarPagoAlqAction(cobro.id, { monto: f.monto, fecha: f.fecha, medio: f.medio, notas: f.notas });
                    if (!r.ok) return setError(r.error);
                    setAviso(`Cobro registrado. Recibo N° ${String(r.recibo).padStart(6, "0")}.`);
                    setCobro(null);
                    router.refresh();
                  });
                }}
              >
                <p className="text-sm text-brand-black/60 sm:col-span-2">
                  {c.direccion} · alquiler {formatoMonto(cobro.monto, c.moneda)}
                  {cobro.extras ? ` + ${cobro.extrasDetalle || "extras"} ${formatoMonto(cobro.extras, c.moneda)}` : ""}
                  {punitoriosCalculados(cobro, c, hoy) ? ` + mora ${formatoMonto(punitoriosCalculados(cobro, c, hoy), c.moneda)}` : ""}
                </p>
                <Campo label="Monto cobrado *">
                  <input name="monto" inputMode="decimal" required defaultValue={sugerido} className={input} />
                </Campo>
                <Campo label="Fecha de pago">
                  <input type="date" name="fecha" defaultValue={hoy} className={input} />
                </Campo>
                <Campo label="Medio de pago">
                  <select name="medio" defaultValue="transferencia" className={input}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="mercadopago">Mercado Pago</option>
                  </select>
                </Campo>
                <Campo label="Observaciones (salen en el recibo)">
                  <input name="notas" defaultValue={cobro.notas ?? ""} className={input} />
                </Campo>
                <Guardar pendiente={pendiente} texto="Registrar cobro" />
              </form>
            </Modal>
          );
        })()}

      {cuotaEdit && (() => {
        const ct = contrato.get(cuotaEdit.contratoId);
        const mon = ct?.moneda === "USD" ? "USD" : "$";
        const pagada = !!cuotaEdit.pagadoEn;
        return (
        <Modal titulo={`Editar ${nombrePeriodo(cuotaEdit.periodo)}`} onClose={() => setCuotaEdit(null)}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              correr(
                () =>
                  editarCuotaAlqAction(cuotaEdit.id, {
                    monto: f.monto,
                    extras: f.extras,
                    extrasDetalle: f.extrasDetalle,
                    punitorios: f.punitorios,
                    vencimiento: f.vencimiento,
                    notas: f.notas,
                    ...(pagada ? { pagadoMonto: f.pagadoMonto, pagadoEn: f.pagadoEn, medioPago: f.medioPago } : {}),
                  }),
                "Mes actualizado.",
                () => setCuotaEdit(null)
              );
            }}
          >
            <Campo label={`Alquiler del mes (${mon})`}>
              <input name="monto" inputMode="decimal" defaultValue={cuotaEdit.monto} className={input} />
            </Campo>
            <Campo label="Vencimiento">
              <input type="date" name="vencimiento" defaultValue={cuotaEdit.vencimiento} className={input} />
            </Campo>
            <Campo label={`Extras a cobrar (${mon})`}>
              <input name="extras" inputMode="decimal" defaultValue={cuotaEdit.extras} className={input} />
            </Campo>
            <Campo label="Detalle de los extras">
              <input name="extrasDetalle" defaultValue={cuotaEdit.extrasDetalle ?? ""} placeholder="Ej: Expensas octubre" className={input} />
            </Campo>
            <Campo label="Otros cargos fijos (ej. mora pactada)">
              <input name="punitorios" inputMode="decimal" defaultValue={cuotaEdit.punitorios} className={input} />
            </Campo>
            <Campo label="Observaciones">
              <input name="notas" defaultValue={cuotaEdit.notas ?? ""} className={input} />
            </Campo>
            {pagada && (
              <>
                <p className="border-t border-black/10 pt-3 text-xs font-semibold uppercase text-brand-black/50 sm:col-span-2">
                  Cobro registrado · recibo N° {String(cuotaEdit.reciboNumero ?? 0).padStart(6, "0")}
                </p>
                <Campo label={`Monto cobrado (${mon})`}>
                  <input
                    name="pagadoMonto"
                    inputMode="decimal"
                    defaultValue={cuotaEdit.pagadoMonto ?? ""}
                    readOnly={!!cuotaEdit.liquidacionId}
                    className={`${input} ${cuotaEdit.liquidacionId ? "bg-black/5 text-brand-black/50" : ""}`}
                  />
                </Campo>
                <Campo label="Fecha de pago">
                  <input type="date" name="pagadoEn" defaultValue={cuotaEdit.pagadoEn ?? ""} className={input} />
                </Campo>
                <Campo label="Medio de pago">
                  <select name="medioPago" defaultValue={cuotaEdit.medioPago ?? "transferencia"} className={input}>
                    <option value="transferencia">Transferencia</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="mercadopago">Mercado Pago</option>
                  </select>
                </Campo>
                <p className="text-[11px] text-brand-black/50 sm:col-span-2">
                  {cuotaEdit.liquidacionId
                    ? "Este cobro ya está liquidado al propietario: para cambiar el monto cobrado, borrá antes la liquidación."
                    : "El recibo se actualiza solo con estos datos (mantiene el mismo número)."}
                </p>
              </>
            )}
            <Guardar pendiente={pendiente} />
          </form>
        </Modal>
        );
      })()}

      {servicioEdit && (
        <Modal titulo={servicioEdit.id ? "Editar gasto / servicio" : "Cargar gasto / servicio"} onClose={() => setServicioEdit(null)}>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
              correr(
                () => guardarServicioAlqAction({ ...f, id: servicioEdit.id ?? "", periodo: f.periodo ? `${f.periodo}-01` : "", pagado: f.pagado === "on" ? "true" : "false" }),
                "Guardado.",
                () => setServicioEdit(null)
              );
            }}
          >
            <Campo label="Contrato / propiedad *" className="sm:col-span-2">
              <select name="contratoId" defaultValue={servicioEdit.contratoId ?? activos[0]?.id} required className={input}>
                {datos.contratos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.direccion}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Concepto *">
              <input name="concepto" list="conceptos-alq" defaultValue={servicioEdit.concepto} required className={input} />
              <datalist id="conceptos-alq">
                {CONCEPTOS_SERVICIO.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Campo>
            <Campo label="A cargo de">
              <select name="aCargo" defaultValue={servicioEdit.aCargo ?? "inquilino"} className={input}>
                <option value="inquilino">Inquilino</option>
                <option value="propietario">Propietario</option>
              </select>
            </Campo>
            <Campo label="Mes">
              <input type="month" name="periodo" defaultValue={servicioEdit.periodo?.slice(0, 7) ?? hoy.slice(0, 7)} className={input} />
            </Campo>
            <Campo label="Vencimiento">
              <input type="date" name="vencimiento" defaultValue={servicioEdit.vencimiento ?? ""} className={input} />
            </Campo>
            <Campo label="Monto">
              <input name="monto" inputMode="decimal" defaultValue={servicioEdit.monto ?? ""} className={input} />
            </Campo>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="pagado" defaultChecked={servicioEdit.pagado} /> Ya está pagado
            </label>
            <Campo label="Notas" className="sm:col-span-2">
              <input name="notas" defaultValue={servicioEdit.notas ?? ""} className={input} />
            </Campo>
            <Guardar pendiente={pendiente} />
          </form>
        </Modal>
      )}

      {liquidar &&
        (() => {
          const cobradas = datos.cuotas.filter((q) => q.contratoId === liquidar.id && q.pagadoEn && !q.liquidacionId);
          const total = cobradas.reduce((s, q) => s + (q.pagadoMonto ?? 0), 0);
          const base = cobradas.reduce((s, q) => s + Math.min(q.pagadoMonto ?? 0, q.monto + q.punitorios), 0);
          const comision = Math.round(base * liquidar.comisionAdminPct) / 100;
          const gastosProp = datos.servicios.filter((s) => s.contratoId === liquidar.id && s.aCargo === "propietario" && s.pagado && s.monto);
          return (
            <Modal titulo={`Liquidar · ${liquidar.direccion}`} onClose={() => setLiquidar(null)}>
              {cobradas.length === 0 ? (
                <p className="text-sm text-brand-black/60">No hay cobros pendientes de liquidar en este contrato.</p>
              ) : (
                <form
                  className="grid gap-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const f = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
                    correr(
                      () => crearLiquidacionAction(liquidar.id, { gastos: f.gastos, gastosDetalle: f.gastosDetalle, notas: f.notas }),
                      "Liquidación creada. Podés enviarla al propietario desde la pestaña Liquidaciones.",
                      () => {
                        setLiquidar(null);
                        setTab("liquidaciones");
                      }
                    );
                  }}
                >
                  <ul className="text-sm text-brand-black/70">
                    {cobradas.map((q) => (
                      <li key={q.id}>
                        • {nombrePeriodo(q.periodo)}: {formatoMonto(q.pagadoMonto ?? 0, liquidar.moneda)}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm">
                    Cobrado <b>{formatoMonto(total, liquidar.moneda)}</b> − comisión {liquidar.comisionAdminPct}% <b>{formatoMonto(comision, liquidar.moneda)}</b>
                  </p>
                  {gastosProp.length > 0 && (
                    <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      Gastos del propietario pagados: {gastosProp.map((s) => `${s.concepto} ${formatoMonto(s.monto ?? 0, liquidar.moneda)}`).join(", ")}. Si los pagaste vos, descontalos abajo.
                    </p>
                  )}
                  <Campo label="Gastos a descontar (reparaciones, impuestos que pagaste vos…)">
                    <input name="gastos" inputMode="decimal" defaultValue="0" className={input} />
                  </Campo>
                  <Campo label="Detalle de los gastos">
                    <input name="gastosDetalle" className={input} />
                  </Campo>
                  <Campo label="Notas">
                    <input name="notas" className={input} placeholder="Opcional" />
                  </Campo>
                  <Guardar pendiente={pendiente} texto="Crear liquidación" />
                </form>
              )}
            </Modal>
          );
        })()}
    </div>
  );
}

function Chip({ c, children }: { c: string; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c}`}>{children}</span>;
}

function Vacio({ texto }: { texto: string }) {
  return <p className="rounded-xl bg-white p-4 text-sm text-brand-black/60 shadow-sm">{texto}</p>;
}

function Guardar({ pendiente, texto = "Guardar" }: { pendiente: boolean; texto?: string }) {
  return (
    <div className="flex justify-end sm:col-span-2">
      <button type="submit" disabled={pendiente} className="rounded-lg bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        {pendiente ? "Guardando…" : texto}
      </button>
    </div>
  );
}

function Resumen({
  datos,
  hoy,
  contrato,
  persona,
  onIr,
  onCobrar,
}: {
  datos: Datos;
  hoy: string;
  contrato: Map<string, ContratoAlq>;
  persona: Map<string, PersonaAlq>;
  onIr: (t: Tab) => void;
  onCobrar: (c: CuotaAlq) => void;
}) {
  const mes = hoy.slice(0, 7);
  const activos = datos.contratos.filter((c) => c.estado === "activo");
  const vencidas = datos.cuotas.filter((q) => !q.pagadoEn && q.vencimiento < hoy && contrato.get(q.contratoId)?.estado === "activo");
  const delMes = datos.cuotas.filter((q) => q.periodo.startsWith(mes));
  const cobradoMes = delMes.filter((q) => q.pagadoEn).length;
  const sinLiquidar = datos.cuotas.filter((q) => q.pagadoEn && !q.liquidacionId).length;
  const porVencer = activos.filter((c) => diasParaVencer(c.fechaFin, hoy) <= 90);
  const ajustes = activos.filter((c) => c.proximoAjuste && diasParaVencer(c.proximoAjuste, hoy) <= 30);
  const serviciosVencidos = datos.servicios.filter((s) => !s.pagado && s.vencimiento && s.vencimiento < hoy);

  const tarjetas = [
    { n: activos.length, t: "Contratos activos", ir: "contratos" as Tab },
    { n: `${cobradoMes}/${delMes.length}`, t: "Cobrados este mes", ir: "cobros" as Tab },
    { n: vencidas.length, t: "Pagos vencidos", ir: "cobros" as Tab, alerta: vencidas.length > 0 },
    { n: sinLiquidar, t: "Cobros sin liquidar al propietario", ir: "contratos" as Tab },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((x) => (
          <button key={x.t} type="button" onClick={() => onIr(x.ir)} className="rounded-xl bg-white p-4 text-left shadow-sm">
            <p className={`text-2xl font-bold ${x.alerta ? "text-red-700" : "text-brand-black"}`}>{x.n}</p>
            <p className="text-xs text-brand-black/60">{x.t}</p>
          </button>
        ))}
      </div>

      {datos.contratos.length === 0 && (
        <div className="rounded-xl bg-white p-5 text-sm text-brand-black/70 shadow-sm">
          <p className="font-semibold text-brand-black">Para empezar:</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5">
            <li>En <b>Propietarios e inquilinos</b>, cargá al dueño y al inquilino.</li>
            <li>En <b>Contratos</b>, cargá el contrato: fechas, monto, día de vencimiento y tu comisión. Los meses se generan solos.</li>
            <li>Cada mes, en <b>Cobros</b>, registrá el pago (o mandá el link de Mercado Pago). El recibo sale automático.</li>
            <li>En <b>Contratos → Liquidar</b>, le rendís al propietario lo cobrado menos tu comisión.</li>
            <li>A cada uno mandale su link: el inquilino ve su historial, la próxima cuota y los recibos; el propietario, los cobros y liquidaciones.</li>
          </ol>
        </div>
      )}

      {vencidas.length > 0 && (
        <Lista titulo="Pagos vencidos">
          {vencidas.map((q) => {
            const c = contrato.get(q.contratoId)!;
            const inq = persona.get(c.inquilinoId);
            return (
              <li key={q.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <b>{c.direccion}</b> · {nombrePeriodo(q.periodo)} · {inq?.nombre} · {formatoMonto(totalCuota(q, c, hoy), c.moneda)} (venció {fechaCorta(q.vencimiento)})
                </span>
                <span className="flex gap-1.5">
                  {inq?.telefono && (
                    <a
                      href={buildWhatsappClienteUrl(
                        inq.telefono,
                        `Hola ${inq.nombre.split(" ")[0]}! Te recordamos que el alquiler de ${nombrePeriodo(q.periodo)} (${c.direccion}) venció el ${fechaCorta(q.vencimiento)}. Total a hoy: ${formatoMonto(totalCuota(q, c, hoy), c.moneda)}.`
                      )}
                      target="_blank"
                      rel="noopener"
                      className={`${btn} bg-emerald-600 text-white`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Recordar
                    </a>
                  )}
                  <button type="button" onClick={() => onCobrar(q)} className={`${btn} bg-brand-black text-white`}>
                    Registrar cobro
                  </button>
                </span>
              </li>
            );
          })}
        </Lista>
      )}

      {porVencer.length > 0 && (
        <Lista titulo="Contratos que vencen en los próximos 90 días">
          {porVencer.map((c) => (
            <li key={c.id} className="py-2 text-sm">
              <b>{c.direccion}</b> · {persona.get(c.inquilinoId)?.nombre} · vence {fechaCorta(c.fechaFin)} ({diasParaVencer(c.fechaFin, hoy)} días)
            </li>
          ))}
        </Lista>
      )}

      {ajustes.length > 0 && (
        <Lista titulo="Ajustes de alquiler en los próximos 30 días">
          {ajustes.map((c) => (
            <li key={c.id} className="py-2 text-sm">
              <b>{c.direccion}</b> · ajuste el {fechaCorta(c.proximoAjuste)} · hoy {formatoMonto(c.montoActual, c.moneda)}
              {c.ajusteDetalle ? ` · ${c.ajusteDetalle}` : ""}
            </li>
          ))}
        </Lista>
      )}

      {serviciosVencidos.length > 0 && (
        <Lista titulo="Expensas / servicios vencidos sin pagar">
          {serviciosVencidos.map((s) => (
            <li key={s.id} className="py-2 text-sm">
              <b>{contrato.get(s.contratoId)?.direccion}</b> · {s.concepto} · a cargo del {s.aCargo} · venció {fechaCorta(s.vencimiento)}
            </li>
          ))}
        </Lista>
      )}
    </div>
  );
}

function Lista({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-brand-black">{titulo}</p>
      <ul className="mt-1 divide-y divide-black/5">{children}</ul>
    </div>
  );
}

function Cobros({
  datos,
  hoy,
  contrato,
  persona,
  sitio,
  onCobrar,
  onEditar,
  onAnular,
  onLinkMp,
}: {
  datos: Datos;
  hoy: string;
  contrato: Map<string, ContratoAlq>;
  persona: Map<string, PersonaAlq>;
  sitio: string;
  onCobrar: (c: CuotaAlq) => void;
  onEditar: (c: CuotaAlq) => void;
  onAnular: (c: CuotaAlq) => void;
  onLinkMp: (c: CuotaAlq) => void;
}) {
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const [filtro, setFiltro] = useState<"mes" | "vencidas" | "todas">("mes");
  const lista = datos.cuotas
    .filter((q) => {
      if (filtro === "mes") return q.periodo.startsWith(mes);
      if (filtro === "vencidas") return !q.pagadoEn && q.vencimiento < hoy;
      return true;
    })
    .sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm">
          <option value="mes">Por mes</option>
          <option value="vencidas">Solo vencidos</option>
          <option value="todas">Todos</option>
        </select>
        {filtro === "mes" && <input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-sm" />}
      </div>
      {lista.length === 0 && <Vacio texto="No hay cobros para mostrar." />}
      {lista.map((q) => {
        const c = contrato.get(q.contratoId);
        if (!c) return null;
        const inq = persona.get(c.inquilinoId);
        const e = estadoCuota(q, hoy);
        const recibo = `/api/alquileres/recibo/${q.id}`;
        return (
          <div key={q.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-sm">
            <div className="text-sm">
              <p className="font-semibold text-brand-black">
                {c.direccion} · <span className="capitalize">{nombrePeriodo(q.periodo)}</span>
              </p>
              <p className="text-xs text-brand-black/60">
                {inq?.nombre} ·{" "}
                {q.pagadoEn
                  ? `Pagó ${formatoMonto(q.pagadoMonto ?? 0, c.moneda)} el ${fechaCorta(q.pagadoEn)} (${q.medioPago}) · recibo N° ${String(q.reciboNumero ?? 0).padStart(6, "0")}`
                  : `${formatoMonto(totalCuota(q, c, hoy), c.moneda)} · vence ${fechaCorta(q.vencimiento)}`}
                {q.pagadoEn && (q.pagadoMonto ?? 0) + 0.009 < q.monto + q.extras && (
                  <span className="font-semibold text-amber-700">
                    {" "}
                    · el mes era de {formatoMonto(q.monto + q.extras, c.moneda)}: faltan{" "}
                    {formatoMonto(q.monto + q.extras - (q.pagadoMonto ?? 0), c.moneda)}
                  </span>
                )}
                {q.extras ? ` · incluye ${q.extrasDetalle || "extras"}` : ""}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip c={ESTADO_CUOTA[e].c}>{ESTADO_CUOTA[e].t}</Chip>
              {q.pagadoEn ? (
                <>
                  <a href={recibo} target="_blank" className={`${btn} bg-black/5`}>
                    <FileText className="h-3.5 w-3.5" /> Recibo
                  </a>
                  {inq?.telefono && (
                    <a
                      href={buildWhatsappClienteUrl(inq.telefono, `Hola ${inq.nombre.split(" ")[0]}! Te paso el recibo del alquiler de ${nombrePeriodo(q.periodo)}: ${sitio}${recibo}?t=${inq.token}`)}
                      target="_blank"
                      rel="noopener"
                      className={`${btn} bg-emerald-600 text-white`}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Enviar
                    </a>
                  )}
                  <button type="button" onClick={() => onEditar(q)} className={`${btn} bg-black/5`}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button type="button" onClick={() => onAnular(q)} className={`${btn} text-red-600`}>
                    Anular
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => onCobrar(q)} className={`${btn} bg-brand-black text-white`}>
                    Registrar cobro
                  </button>
                  {c.moneda === "ARS" && (
                    <button type="button" onClick={() => onLinkMp(q)} className={`${btn} bg-[#009ee3] text-white`}>
                      Link Mercado Pago
                    </button>
                  )}
                  <button type="button" onClick={() => onEditar(q)} className={`${btn} bg-black/5`}>
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
