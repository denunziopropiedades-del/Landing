"use client";

import { useMemo, useState, useTransition } from "react";
import { FileText, MessageCircle, Mail, Plus, Receipt, Send, Settings, Trash2, Undo2, X } from "lucide-react";
import {
  crearFacturaManualAction,
  actualizarBorradorAction,
  descartarBorradorAction,
  emitirFacturaAction,
  guardarConfigArcaAction,
  reenviarFacturaEmailAction,
  type DatosFacturaManual,
  type DatosPanelArca,
} from "@/lib/admin/arca-actions";
import type { Factura, ItemFactura } from "@/lib/arca/facturas";

const CONDICIONES: [number, string][] = [
  [5, "Consumidor final"],
  [6, "Responsable Monotributo"],
  [1, "IVA Responsable Inscripto"],
  [4, "IVA Sujeto Exento"],
  [13, "Monotributista Social"],
  [15, "IVA No Alcanzado"],
];
const DOCS: [number, string][] = [
  [96, "DNI"],
  [80, "CUIT"],
  [86, "CUIL"],
  [99, "Sin identificar"],
];
const CONCEPTOS = [
  "Seña / reserva",
  "Honorarios profesionales",
  "Honorarios profesionales · gestión de cobranza",
  "Honorarios profesionales · administración de alquiler",
  "Tasación inmobiliaria",
  "Otro",
];
const MEDIOS = ["transferencia", "efectivo", "mercadopago", "otro"];
const ORIGEN: Record<string, string> = { manual: "Manual", sena: "Seña", honorario_cuota: "Honorario cuota", alquiler: "Alquiler", otro: "Otro" };
const ESTADO: Record<string, { txt: string; cls: string }> = {
  borrador: { txt: "Borrador", cls: "bg-amber-100 text-amber-900" },
  enviando: { txt: "Pendiente ARCA", cls: "bg-orange-100 text-orange-900" },
  autorizada: { txt: "Autorizada", cls: "bg-emerald-100 text-emerald-900" },
  rechazada: { txt: "Rechazada", cls: "bg-red-100 text-red-800" },
  descartada: { txt: "Descartada", cls: "bg-gray-100 text-gray-600" },
};

const input = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const label = "mb-1 block text-xs font-medium text-brand-black/70";
const btn = "inline-flex items-center gap-1.5 rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 disabled:opacity-50";

const pad = (n: number | null, l: number) => (n == null ? "—" : String(n).padStart(l, "0"));
const numero = (f: Factura) => (f.numero ? `${pad(f.puntoVenta, 5)}-${pad(f.numero, 8)}` : "—");
const fecha = (iso: string | null) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "—");
const dinero = (v: number, m: "PES" | "DOL") =>
  `${m === "DOL" ? "US$" : "$"} ${v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signo = (f: Factura) => (f.tipoCbte === 13 ? -1 : 1);

export type ClienteCrm = { id: string; nombre: string; dni: string | null; email: string | null; telefono: string | null };

type Form = DatosFacturaManual & { id?: string };

function formVacio(): Form {
  return {
    tipoCbte: 11,
    facturaAsociadaId: null,
    leadId: null,
    receptorDocTipo: 96,
    receptorDocNro: "",
    receptorNombre: "",
    receptorDomicilio: "",
    receptorEmail: "",
    receptorTelefono: "",
    receptorCondicionIva: 5,
    moneda: "PES",
    cancelaMismaMoneda: true,
    conceptoTipo: CONCEPTOS[0],
    items: [{ descripcion: CONCEPTOS[0], detalle: "", cantidad: 1, precio: 0 }],
    periodoDesde: "",
    periodoHasta: "",
    vtoPago: "",
    medioPago: "transferencia",
  };
}

function formDeFactura(f: Factura, comoNotaCredito = false): Form {
  return {
    id: comoNotaCredito ? undefined : f.id,
    tipoCbte: comoNotaCredito ? 13 : f.tipoCbte,
    facturaAsociadaId: comoNotaCredito ? f.id : f.facturaAsociadaId,
    leadId: f.leadId,
    receptorDocTipo: f.receptorDocTipo,
    receptorDocNro: f.receptorDocNro === "0" ? "" : f.receptorDocNro,
    receptorNombre: f.receptorNombre,
    receptorDomicilio: f.receptorDomicilio ?? "",
    receptorEmail: f.receptorEmail ?? "",
    receptorTelefono: f.receptorTelefono ?? "",
    receptorCondicionIva: f.receptorCondicionIva,
    moneda: f.moneda,
    cancelaMismaMoneda: f.cancelaMismaMoneda,
    conceptoTipo: f.conceptoTipo ?? CONCEPTOS[0],
    items: f.items.map((i) => ({ ...i, detalle: comoNotaCredito ? `Anula factura ${numero(f)}${i.detalle ? ` · ${i.detalle}` : ""}` : i.detalle })),
    periodoDesde: f.periodoDesde ?? "",
    periodoHasta: f.periodoHasta ?? "",
    vtoPago: "",
    medioPago: f.medioPago ?? "transferencia",
  };
}

export default function ArcaFacturasManager({
  datos,
  clientes,
  leadInicial,
  linkWhatsapp,
}: {
  datos: DatosPanelArca;
  clientes: ClienteCrm[];
  leadInicial?: string | null;
  linkWhatsapp: Record<string, string>;
}) {
  const { facturas, config, credenciales } = datos;
  const [pending, start] = useTransition();
  const [mensaje, setMensaje] = useState<{ ok: boolean; txt: string } | null>(null);
  const [form, setForm] = useState<Form | null>(() => {
    if (!leadInicial) return null;
    const c = clientes.find((x) => x.id === leadInicial);
    if (!c) return formVacio();
    return { ...formVacio(), ...datosCliente(c) };
  });
  const [verConfig, setVerConfig] = useState(!config.domicilio || !config.iibb);
  const [filtroEstado, setFiltroEstado] = useState("activas");
  const [filtroMoneda, setFiltroMoneda] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");
  const anio = new Date().getFullYear();

  function datosCliente(c: ClienteCrm): Partial<Form> {
    const dni = (c.dni ?? "").replace(/\D/g, "");
    return {
      leadId: c.id,
      receptorNombre: c.nombre,
      receptorDocTipo: dni.length === 11 ? 80 : dni ? 96 : 99,
      receptorDocNro: dni,
      receptorEmail: c.email ?? "",
      receptorTelefono: c.telefono ?? "",
    };
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return facturas.filter((f) => {
      if (filtroEstado === "activas" && f.estado === "descartada") return false;
      if (filtroEstado && filtroEstado !== "activas" && f.estado !== filtroEstado) return false;
      if (filtroMoneda && f.moneda !== filtroMoneda) return false;
      if (filtroDesde && f.fecha < filtroDesde) return false;
      if (filtroHasta && f.fecha > filtroHasta) return false;
      if (q && !`${f.receptorNombre} ${f.receptorDocNro} ${numero(f)} ${f.conceptoTipo ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [facturas, filtroEstado, filtroMoneda, busqueda, filtroDesde, filtroHasta]);

  const totales = useMemo(() => {
    const t = { ars: 0, usd: 0, anualPesos: 0, pendientes: 0 };
    for (const f of facturas) {
      if (f.estado === "borrador" || f.estado === "enviando" || f.estado === "rechazada") t.pendientes++;
      if (f.estado !== "autorizada" || f.entorno !== config.entorno || !f.fecha.startsWith(String(anio))) continue;
      const v = f.importeTotal * signo(f);
      if (f.moneda === "DOL") t.usd += v;
      else t.ars += v;
      t.anualPesos += f.moneda === "DOL" ? v * f.cotizacion : v;
    }
    return t;
  }, [facturas, config.entorno, anio]);

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) =>
    start(async () => {
      setMensaje(null);
      const r = await fn();
      setMensaje(r.ok ? { ok: true, txt: exito } : { ok: false, txt: (r as { error: string }).error });
    });

  const total = form ? Math.round(form.items.reduce((t, i) => t + (Number(i.cantidad) || 0) * (Number(i.precio) || 0), 0) * 100) / 100 : 0;
  const asociadas = facturas.filter((f) => f.estado === "autorizada" && f.tipoCbte === 11 && f.entorno === config.entorno);

  function guardar(emitir: boolean) {
    if (!form) return;
    if (emitir) {
      const que = form.tipoCbte === 13 ? "la nota de crédito" : "la factura";
      const entorno = config.entorno === "produccion" ? "REAL (producción)" : "de PRUEBA (homologación)";
      if (!confirm(`Vas a emitir ${que} ${entorno} por ${dinero(total, form.moneda)} a ${form.receptorNombre}.\n\nUna vez autorizada por ARCA no se puede borrar (solo anular con nota de crédito). ¿Emitir?`)) return;
    }
    const datosForm = { ...form, items: form.items.map((i) => ({ ...i, cantidad: Number(i.cantidad), precio: Number(i.precio) })) };
    start(async () => {
      setMensaje(null);
      let r: { ok: boolean; error?: string };
      if (form.id) {
        r = await actualizarBorradorAction(form.id, datosForm);
        if (r.ok && emitir) r = await emitirFacturaAction(form.id);
      } else {
        r = await crearFacturaManualAction(datosForm, emitir);
      }
      if (r.ok) {
        setForm(null);
        setMensaje({ ok: true, txt: emitir ? "Comprobante autorizado por ARCA. En producción se le envía solo por mail; en pruebas, solo si tocás Enviar." : "Borrador guardado." });
      } else setMensaje({ ok: false, txt: (r as { error: string }).error });
    });
  }

  const setItem = (idx: number, cambio: Partial<ItemFactura>) =>
    setForm((f) => (f ? { ...f, items: f.items.map((it, i) => (i === idx ? { ...it, ...cambio } : it)) } : f));

  return (
    <div className="space-y-6">
      {/* Estado de la conexión */}
      <div
        className={`flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm ${config.entorno === "produccion" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
      >
        <span className="font-semibold">{config.entorno === "produccion" ? "Producción: las facturas son reales" : "Modo PRUEBAS (homologación): las facturas no tienen validez fiscal"}</span>
        <span className="text-xs">
          Punto de venta {pad(config.puntoVenta, 5)} · Certificado {config.entorno === "produccion" ? (credenciales.produccion ? "cargado" : "FALTA") : credenciales.homologacion ? "cargado" : "FALTA"} ·
          Emisión {config.emisionAutomatica ? "automática al cobrar" : "con aprobación manual"}
        </span>
        <a href="/api/arca/diagnostico" target="_blank" className="ml-auto text-xs font-medium underline">
          Probar conexión con ARCA
        </a>
      </div>

      {/* Resumen */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          [`Facturado ${anio} en pesos`, dinero(totales.ars, "PES")],
          [`Facturado ${anio} en dólares`, dinero(totales.usd, "DOL")],
          [`Acumulado ${anio} convertido a pesos (monotributo)`, dinero(totales.anualPesos, "PES")],
          ["Pendientes de emitir", String(totales.pendientes)],
        ].map(([t, v]) => (
          <div key={t} className="rounded-xl bg-white p-4 shadow-sm">
            <p className="text-xs text-brand-black/60">{t}</p>
            <p className="mt-1 text-lg font-bold text-brand-black">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setForm(formVacio())}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-black-soft"
        >
          <Plus className="h-4 w-4" /> ARCA - FACTURAS · Nueva factura
        </button>
        <a className={btn} href={`/api/admin/arca/facturas/exportar?${new URLSearchParams({ formato: "xlsx", estado: filtroEstado, moneda: filtroMoneda, q: busqueda, desde: filtroDesde, hasta: filtroHasta })}`}>
          <FileText className="h-4 w-4" /> Exportar Excel
        </a>
        <a className={btn} href={`/api/admin/arca/facturas/exportar?${new URLSearchParams({ formato: "pdf", estado: filtroEstado, moneda: filtroMoneda, q: busqueda, desde: filtroDesde, hasta: filtroHasta })}`}>
          <FileText className="h-4 w-4" /> Exportar PDF
        </a>
        <button type="button" onClick={() => setVerConfig((v) => !v)} className={btn}>
          <Settings className="h-4 w-4" /> Datos del emisor y opciones
        </button>
      </div>

      {mensaje && (
        <div className={`rounded-lg px-4 py-3 text-sm ${mensaje.ok ? "bg-emerald-50 text-emerald-900" : "bg-red-50 text-red-800"}`}>{mensaje.txt}</div>
      )}

      {verConfig && <ConfigForm datos={datos} pending={pending} onGuardar={(c) => correr(() => guardarConfigArcaAction(c), "Datos guardados.")} />}

      {/* Formulario */}
      {form && (
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-brand-black">
              {form.id ? "Revisar borrador" : form.tipoCbte === 13 ? "Nueva nota de crédito C" : "Nueva factura C"}
            </h2>
            <button type="button" onClick={() => setForm(null)} aria-label="Cerrar">
              <X className="h-5 w-5 text-brand-black/50" />
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className={label}>Tipo de comprobante</label>
              <select
                className={input}
                value={form.tipoCbte}
                disabled={!!form.id}
                onChange={(e) => setForm({ ...form, tipoCbte: Number(e.target.value) as 11 | 13 })}
              >
                <option value={11}>Factura C</option>
                <option value={13}>Nota de crédito C</option>
              </select>
            </div>
            {form.tipoCbte === 13 && (
              <div className="md:col-span-2">
                <label className={label}>Factura que anula</label>
                <select
                  className={input}
                  value={form.facturaAsociadaId ?? ""}
                  onChange={(e) => {
                    const f = asociadas.find((x) => x.id === e.target.value);
                    setForm(f ? { ...formDeFactura(f, true) } : { ...form, facturaAsociadaId: null });
                  }}
                >
                  <option value="">Elegir…</option>
                  {asociadas.map((f) => (
                    <option key={f.id} value={f.id}>
                      {numero(f)} · {f.receptorNombre} · {dinero(f.importeTotal, f.moneda)}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.tipoCbte === 11 && (
              <div className="md:col-span-2">
                <label className={label}>Cliente del CRM (opcional, completa los datos)</label>
                <select
                  className={input}
                  value={form.leadId ?? ""}
                  onChange={(e) => {
                    const c = clientes.find((x) => x.id === e.target.value);
                    setForm(c ? { ...form, ...datosCliente(c) } : { ...form, leadId: null });
                  }}
                >
                  <option value="">Cargar a mano…</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                      {c.dni ? ` · ${c.dni}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="md:col-span-2">
              <label className={label}>Apellido y nombre / Razón social</label>
              <input className={input} value={form.receptorNombre} onChange={(e) => setForm({ ...form, receptorNombre: e.target.value })} />
            </div>
            <div>
              <label className={label}>Condición frente al IVA</label>
              <select className={input} value={form.receptorCondicionIva} onChange={(e) => setForm({ ...form, receptorCondicionIva: Number(e.target.value) })}>
                {CONDICIONES.map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Documento</label>
              <div className="flex gap-2">
                <select className={`${input} w-28`} value={form.receptorDocTipo} onChange={(e) => setForm({ ...form, receptorDocTipo: Number(e.target.value) })}>
                  {DOCS.map(([v, t]) => (
                    <option key={v} value={v}>
                      {t}
                    </option>
                  ))}
                </select>
                <input
                  className={input}
                  disabled={form.receptorDocTipo === 99}
                  value={form.receptorDocNro}
                  placeholder={form.receptorDocTipo === 96 ? "30123456" : "20301234567"}
                  onChange={(e) => setForm({ ...form, receptorDocNro: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className={label}>Email (se le envía la factura)</label>
              <input className={input} type="email" value={form.receptorEmail} onChange={(e) => setForm({ ...form, receptorEmail: e.target.value })} />
            </div>
            <div>
              <label className={label}>WhatsApp</label>
              <input className={input} value={form.receptorTelefono} onChange={(e) => setForm({ ...form, receptorTelefono: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className={label}>Domicilio (opcional)</label>
              <input className={input} value={form.receptorDomicilio} onChange={(e) => setForm({ ...form, receptorDomicilio: e.target.value })} />
            </div>
            <div>
              <label className={label}>Medio de pago</label>
              <select className={input} value={form.medioPago} onChange={(e) => setForm({ ...form, medioPago: e.target.value })}>
                {MEDIOS.map((m) => (
                  <option key={m} value={m}>
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={label}>Moneda</label>
              <select className={input} value={form.moneda} onChange={(e) => setForm({ ...form, moneda: e.target.value as "PES" | "DOL" })}>
                <option value="PES">Pesos ($)</option>
                <option value="DOL">Dólares (US$)</option>
              </select>
            </div>
            {form.moneda === "DOL" && (
              <div className="md:col-span-2">
                <label className={label}>¿El cliente paga en dólares?</label>
                <select
                  className={input}
                  value={form.cancelaMismaMoneda ? "S" : "N"}
                  onChange={(e) => setForm({ ...form, cancelaMismaMoneda: e.target.value === "S" })}
                >
                  <option value="S">Sí, cancela en dólares (cotización BNA del día hábil anterior, la trae ARCA)</option>
                  <option value="N">No, paga en pesos</option>
                </select>
              </div>
            )}
            <div className={form.moneda === "DOL" ? "md:col-span-3" : "md:col-span-2"}>
              <label className={label}>Concepto</label>
              <select
                className={input}
                value={form.conceptoTipo}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, conceptoTipo: v, items: form.items.map((it, i) => (i === 0 && v !== "Otro" ? { ...it, descripcion: v } : it)) });
                }}
              >
                {CONCEPTOS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={label}>Período desde</label>
              <input type="date" className={input} value={form.periodoDesde} onChange={(e) => setForm({ ...form, periodoDesde: e.target.value })} />
            </div>
            <div>
              <label className={label}>Período hasta</label>
              <input type="date" className={input} value={form.periodoHasta} onChange={(e) => setForm({ ...form, periodoHasta: e.target.value })} />
            </div>
          </div>

          <div className="mt-5">
            <p className={label}>Detalle</p>
            <div className="space-y-2">
              {form.items.map((it, i) => (
                <div key={i} className="grid gap-2 md:grid-cols-[2fr_2fr_80px_140px_32px]">
                  <input className={input} placeholder="Descripción" value={it.descripcion} onChange={(e) => setItem(i, { descripcion: e.target.value })} />
                  <input
                    className={input}
                    placeholder="Referencia (lote, cuota, período…)"
                    value={it.detalle ?? ""}
                    onChange={(e) => setItem(i, { detalle: e.target.value })}
                  />
                  <input type="number" min="1" className={input} value={it.cantidad} onChange={(e) => setItem(i, { cantidad: Number(e.target.value) })} />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={`${input} text-right`}
                    placeholder="Importe"
                    value={it.precio || ""}
                    onChange={(e) => setItem(i, { precio: Number(e.target.value) })}
                  />
                  <button
                    type="button"
                    aria-label="Quitar línea"
                    disabled={form.items.length === 1}
                    onClick={() => setForm({ ...form, items: form.items.filter((_, j) => j !== i) })}
                    className="text-red-600 disabled:opacity-30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={`${btn} mt-2`}
              onClick={() => setForm({ ...form, items: [...form.items, { descripcion: "", detalle: "", cantidad: 1, precio: 0 }] })}
            >
              <Plus className="h-3.5 w-3.5" /> Agregar línea
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-4">
            <p className="text-lg font-bold text-brand-black">Total: {dinero(total, form.moneda)}</p>
            <div className="flex gap-2">
              <button type="button" disabled={pending} onClick={() => guardar(false)} className={btn}>
                Guardar borrador
              </button>
              <button
                type="button"
                disabled={pending || total <= 0}
                onClick={() => guardar(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Send className="h-4 w-4" /> {pending ? "Emitiendo…" : "Emitir en ARCA"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Listado */}
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-black/5 p-3">
          <input className={`${input} max-w-xs`} placeholder="Buscar cliente, número, concepto…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <select className={`${input} w-44`} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="activas">Todas (sin descartadas)</option>
            <option value="">Todas</option>
            {Object.entries(ESTADO).map(([k, v]) => (
              <option key={k} value={k}>
                {v.txt}
              </option>
            ))}
          </select>
          <select className={`${input} w-36`} value={filtroMoneda} onChange={(e) => setFiltroMoneda(e.target.value)}>
            <option value="">Pesos y dólares</option>
            <option value="PES">Pesos</option>
            <option value="DOL">Dólares</option>
          </select>
          <label className="flex items-center gap-1 text-xs text-brand-black/60">
            Desde
            <input type="date" className={`${input} w-40`} value={filtroDesde} onChange={(e) => setFiltroDesde(e.target.value)} />
          </label>
          <label className="flex items-center gap-1 text-xs text-brand-black/60">
            Hasta
            <input type="date" className={`${input} w-40`} value={filtroHasta} onChange={(e) => setFiltroHasta(e.target.value)} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-brand-black/60">
              <tr className="border-b border-black/5">
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Comprobante</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Concepto</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-brand-black/50">
                    Todavía no hay comprobantes. Los cobros acreditados generan borradores acá, o cargá uno con “Nueva factura”.
                  </td>
                </tr>
              )}
              {visibles.map((f) => (
                <tr key={f.id} className="border-b border-black/5 align-top last:border-0">
                  <td className="px-3 py-2 whitespace-nowrap">{fecha(f.fecha)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span className="font-medium">{f.tipoCbte === 13 ? "NC C" : "Factura C"}</span> {numero(f)}
                    <div className="text-[11px] text-brand-black/50">
                      {ORIGEN[f.origen]}
                      {f.entorno === "homologacion" ? " · prueba" : ""}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {f.receptorNombre}
                    <div className="text-[11px] text-brand-black/50">{f.receptorDocTipo === 99 ? "Sin identificar" : f.receptorDocNro}</div>
                  </td>
                  <td className="px-3 py-2">
                    {f.items[0]?.descripcion}
                    {f.items[0]?.detalle && <div className="text-[11px] text-brand-black/50">{f.items[0].detalle}</div>}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">{dinero(f.importeTotal * signo(f), f.moneda)}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ESTADO[f.estado]?.cls}`}>{ESTADO[f.estado]?.txt}</span>
                    {f.cae && <div className="mt-1 text-[11px] text-brand-black/50">CAE {f.cae}</div>}
                    {f.estado === "rechazada" && f.errores && (
                      <div className="mt-1 max-w-xs text-[11px] text-red-700">{[...(f.errores ?? []), ...(f.observaciones ?? [])].map((m) => m.mensaje).join(" · ")}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <a className={btn} href={`/api/admin/arca/facturas/${f.id}/pdf`} target="_blank" rel="noreferrer">
                        <FileText className="h-3.5 w-3.5" /> PDF
                      </a>
                      {["borrador", "rechazada"].includes(f.estado) && (
                        <button type="button" className={btn} onClick={() => setForm(formDeFactura(f))}>
                          <Receipt className="h-3.5 w-3.5" /> Revisar y emitir
                        </button>
                      )}
                      {f.estado === "enviando" && (
                        <button
                          type="button"
                          className={btn}
                          disabled={pending}
                          onClick={() => correr(() => emitirFacturaAction(f.id), "Comprobante autorizado por ARCA.")}
                        >
                          <Send className="h-3.5 w-3.5" /> Reintentar
                        </button>
                      )}
                      {["borrador", "rechazada"].includes(f.estado) && (
                        <button
                          type="button"
                          className={`${btn} text-red-700`}
                          disabled={pending}
                          onClick={() => confirm("¿Descartar este borrador?") && correr(() => descartarBorradorAction(f.id), "Borrador descartado.")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {f.estado === "autorizada" && (
                        <>
                          <button
                            type="button"
                            className={btn}
                            disabled={pending || !f.receptorEmail}
                            title={f.receptorEmail ? `Enviar a ${f.receptorEmail}` : "Sin email"}
                            onClick={() => correr(() => reenviarFacturaEmailAction(f.id), `Enviada a ${f.receptorEmail}.`)}
                          >
                            <Mail className="h-3.5 w-3.5" /> {f.enviadaEmailEn ? "Reenviar" : "Enviar"}
                          </button>
                          {linkWhatsapp[f.id] && (
                            <a className={btn} href={linkWhatsapp[f.id]} target="_blank" rel="noreferrer">
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          )}
                          {f.tipoCbte === 11 && (
                            <button type="button" className={btn} onClick={() => setForm(formDeFactura(f, true))}>
                              <Undo2 className="h-3.5 w-3.5" /> Nota de crédito
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfigForm({
  datos,
  pending,
  onGuardar,
}: {
  datos: DatosPanelArca;
  pending: boolean;
  onGuardar: (c: Partial<DatosPanelArca["config"]>) => void;
}) {
  const c = datos.config;
  const [v, setV] = useState({
    domicilio: c.domicilio,
    iibb: c.iibb,
    inicioActividades: c.inicioActividades ?? "",
    puntoVenta: String(c.puntoVenta),
    topeIdentificacion: String(c.topeIdentificacion),
    entorno: c.entorno,
    emisionAutomatica: c.emisionAutomatica,
  });
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Datos del emisor</h2>
      <p className="mb-4 text-xs text-brand-black/60">
        {c.razonSocial} · CUIT {c.cuit} · {c.condicionIva}. Estos datos salen impresos en cada factura (son obligatorios por ARCA).
      </p>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-3">
          <label className={label}>Domicilio comercial</label>
          <input className={input} value={v.domicilio} onChange={(e) => setV({ ...v, domicilio: e.target.value })} placeholder="Calle 123, San Vicente, Buenos Aires" />
        </div>
        <div>
          <label className={label}>Ingresos Brutos</label>
          <input className={input} value={v.iibb} onChange={(e) => setV({ ...v, iibb: e.target.value })} placeholder="Nro. o “Exento” / “Convenio multilateral”" />
        </div>
        <div>
          <label className={label}>Inicio de actividades</label>
          <input type="date" className={input} value={v.inicioActividades} onChange={(e) => setV({ ...v, inicioActividades: e.target.value })} />
        </div>
        <div>
          <label className={label}>Punto de venta (Web Services)</label>
          <input type="number" className={input} value={v.puntoVenta} onChange={(e) => setV({ ...v, puntoVenta: e.target.value })} />
        </div>
        <div>
          <label className={label}>Entorno</label>
          <select className={input} value={v.entorno} onChange={(e) => setV({ ...v, entorno: e.target.value as "homologacion" | "produccion" })}>
            <option value="homologacion">Pruebas (homologación)</option>
            <option value="produccion">Producción (facturas reales)</option>
          </select>
        </div>
        <div>
          <label className={label}>Emisión</label>
          <select
            className={input}
            value={v.emisionAutomatica ? "auto" : "manual"}
            onChange={(e) => setV({ ...v, emisionAutomatica: e.target.value === "auto" })}
          >
            <option value="manual">Aprobación manual (los cobros quedan en borrador)</option>
            <option value="auto">Automática al acreditarse el cobro</option>
          </select>
        </div>
        <div>
          <label className={label}>Tope consumidor final sin identificar ($)</label>
          <input type="number" className={input} value={v.topeIdentificacion} onChange={(e) => setV({ ...v, topeIdentificacion: e.target.value })} />
        </div>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (v.entorno === "produccion" && c.entorno !== "produccion" && !confirm("Desde ahora las facturas que se emitan serán REALES ante ARCA. ¿Pasar a producción?")) return;
          onGuardar({
            domicilio: v.domicilio,
            iibb: v.iibb,
            inicioActividades: v.inicioActividades || null,
            puntoVenta: Number(v.puntoVenta),
            topeIdentificacion: Number(v.topeIdentificacion),
            entorno: v.entorno,
            emisionAutomatica: v.emisionAutomatica,
          });
        }}
        className="mt-4 rounded-lg bg-brand-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Guardar
      </button>
    </div>
  );
}
