"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, FileSignature, FileText, Loader2, MessageCircle, Plus, Save, Search, Trash2 } from "lucide-react";
import {
  CAMPOS_VALOR,
  ESTADOS_TASACION,
  VALORES_INICIALES,
  caracteristicas,
  descripcionInmueble,
  informeEfectivo,
  labelOpcion,
  promedioComparables,
  unitarioComparable,
  usd,
  type Comparable,
  type EstadoTasacion,
  type InformeTasacion,
  type ValoresZona,
} from "@/lib/tasador";
import {
  actualizarTasacionAction,
  aprobarInformeAction,
  eliminarTasacionAction,
  guardarInformeAction,
  guardarValoresZonaAction,
  retirarInformeAction,
  type DatosPanelTasador,
} from "@/lib/admin/tasador-actions";
import { emitirAutorizacionVentaAction } from "@/lib/admin/docs-clientes-actions";
import { clausulasAutorizacion } from "@/lib/docs-clientes/compartido";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";
import { PARTIDOS, nombrePartido } from "@/lib/zonas";

type Fila = DatosPanelTasador["tasaciones"][number];

const COLOR_ESTADO: Record<EstadoTasacion, string> = {
  nuevo: "bg-sky-100 text-sky-800",
  contactado: "bg-amber-100 text-amber-800",
  informe_enviado: "bg-violet-100 text-violet-800",
  autorizada: "bg-emerald-100 text-emerald-800",
  descartada: "bg-black/5 text-black/50",
};

const ETIQUETA_DOC: Record<string, string> = {
  emitido: "sin enviar",
  enviado: "pendiente de firma",
  aceptado: "firmada",
  rechazado: "rechazada",
  vencido: "vencida",
  anulado: "anulada",
};

const input = "w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm text-brand-black outline-none focus:border-brand-green-700";
const boton = "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-50";

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(iso));

const aNumero = (v: string) => {
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default function TasadorManager({ datos, puedeEliminar }: { datos: DatosPanelTasador; puedeEliminar: boolean }) {
  const [tab, setTab] = useState<"pedidos" | "valores">("pedidos");
  const [filtro, setFiltro] = useState("activos");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return datos.tasaciones.filter((t) => {
      if (filtro === "activos" && t.estado === "descartada") return false;
      if (filtro !== "activos" && filtro !== "todos" && t.estado !== filtro) return false;
      if (q && ![t.nombre, t.telefono, t.email ?? "", t.localidad ?? "", nombrePartido(t.partido)].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [datos.tasaciones, filtro, busqueda]);

  return (
    <div className="space-y-5">
      <div className="flex gap-2">
        {(
          [
            ["pedidos", `Pedidos (${datos.tasaciones.length})`],
            ["valores", "Valores por zona"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${tab === v ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "valores" && <ValoresZonaForm valores={datos.valores} />}

      {tab === "pedidos" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {[{ value: "activos", label: "En curso" }, ...ESTADOS_TASACION, { value: "todos", label: "Todos" }].map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => setFiltro(e.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filtro === e.value ? "bg-brand-green-700 text-white" : "bg-white text-brand-black/70"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-black/40" />
            <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre, teléfono o zona" className={`${input} pl-9`} />
          </label>

          {!lista.length && <p className="rounded-xl bg-white p-6 text-center text-sm text-brand-black/60 shadow-sm">No hay pedidos del tasador en esta vista.</p>}

          {lista.map((t) => (
            <div key={t.id} className="rounded-xl bg-white shadow-sm">
              <button type="button" onClick={() => setAbierto(abierto === t.id ? null : t.id)} className="flex w-full items-start justify-between gap-3 p-4 text-left">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-brand-black">{t.nombre}</p>
                  <p className="truncate text-xs text-brand-black/60">
                    {fecha(t.creadoEn)} · {descripcionInmueble(t)}
                  </p>
                  <p className="mt-1 text-sm font-bold text-brand-green-700">{usd(informeEfectivo(t).central)}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${COLOR_ESTADO[t.estado]}`}>{labelOpcion(ESTADOS_TASACION, t.estado)}</span>
              </button>
              {abierto === t.id && <Detalle t={t} puedeEliminar={puedeEliminar} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───────────── Detalle de un pedido ───────────── */

function Detalle({ t, puedeEliminar }: { t: Fila; puedeEliminar: boolean }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [notas, setNotas] = useState(t.notas ?? "");

  const inicial = informeEfectivo(t);
  const [minimo, setMinimo] = useState(String(inicial.minimo));
  const [central, setCentral] = useState(String(inicial.central));
  const [maximo, setMaximo] = useState(String(inicial.maximo));
  const [publicacion, setPublicacion] = useState(String(inicial.publicacion));
  const [observaciones, setObservaciones] = useState(inicial.observaciones);
  const [comparables, setComparables] = useState<{ descripcion: string; fuente: string; precio: string; superficie: string }[]>(
    inicial.comparables.map((c) => ({ descripcion: c.descripcion, fuente: c.fuente, precio: String(c.precio), superficie: String(c.superficie) }))
  );
  const [link, setLink] = useState<string | null>(t.informeToken && t.informeAprobadoEn ? `${typeof window !== "undefined" ? window.location.origin : ""}/tasador/informe/${t.informeToken}` : null);

  const unidad = t.resultado.unidad ?? "m²";
  const comparablesNum: Comparable[] = comparables.map((c) => ({ descripcion: c.descripcion, fuente: c.fuente, precio: aNumero(c.precio), superficie: aNumero(c.superficie) }));
  const promedio = promedioComparables(comparablesNum);
  const unitario = t.resultado.superficie > 0 ? aNumero(central) / t.resultado.superficie : 0;

  const informe = (): InformeTasacion => ({
    minimo: aNumero(minimo),
    central: aNumero(central),
    maximo: aNumero(maximo),
    publicacion: aNumero(publicacion),
    comparables: comparablesNum,
    observaciones,
  });

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>, listo?: string) =>
    startTransition(async () => {
      setError(null);
      setAviso(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No se pudo guardar.");
      else {
        if (listo) setAviso(listo);
        router.refresh();
      }
    });

  const aprobar = () =>
    startTransition(async () => {
      setError(null);
      setAviso(null);
      const r = await aprobarInformeAction(t.id, informe());
      if (!r.ok) return setError(r.error);
      setLink(r.link);
      setAviso("Informe aprobado. Ya podés enviarle el link al propietario.");
      router.refresh();
    });

  const editarComparable = (i: number, campo: "descripcion" | "fuente" | "precio" | "superficie", valor: string) =>
    setComparables((prev) => prev.map((c, j) => (j === i ? { ...c, [campo]: valor } : c)));

  const mensajeInforme = link
    ? `Hola ${t.nombre.split(" ")[0]}, te compartimos el informe de tasación de tu propiedad (${descripcionInmueble(t)}):\n\n🔗 ${link}\n\nDE NUNZIO NEGOCIOS INMOBILIARIOS\nMatías De Nunzio · Martillero Público · Matrícula COL 7886`
    : "";

  return (
    <div className="space-y-5 border-t border-black/5 p-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      {aviso && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{aviso}</p>}

      {/* Contacto y estado */}
      <div className="flex flex-wrap items-center gap-2">
        <a href={buildWhatsappClienteUrl(t.telefono)} target="_blank" rel="noopener noreferrer" className={`${boton} bg-[#25d366] text-white`}>
          <MessageCircle className="h-4 w-4" /> {t.telefono}
        </a>
        {t.email && <span className="text-sm text-brand-black/70">{t.email}</span>}
        <select
          value={t.estado}
          disabled={pendiente}
          onChange={(e) => correr(() => actualizarTasacionAction(t.id, { estado: e.target.value as EstadoTasacion }))}
          className={`${input} w-auto`}
        >
          {ESTADOS_TASACION.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
      </div>

      {/* Datos cargados por el propietario */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl bg-brand-cream p-4 text-sm">
          <p className="font-bold text-brand-black">{descripcionInmueble(t)}</p>
          <dl className="mt-2 space-y-1">
            {caracteristicas(t).map((c) => (
              <div key={c.etiqueta} className="flex justify-between gap-3">
                <dt className="text-brand-black/60">{c.etiqueta}</dt>
                <dd className="text-right font-medium text-brand-black">{c.valor}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-xl bg-brand-cream p-4 text-sm">
          <p className="font-bold text-brand-black">
            Cálculo automático: {usd(t.resultado.central)}{" "}
            <span className="font-normal text-brand-black/60">
              ({usd(t.resultado.minimo)} a {usd(t.resultado.maximo)})
            </span>
          </p>
          <ul className="mt-2 space-y-1 text-brand-black/75">
            {(t.resultado.desglose ?? []).map((r, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>
                  <b>{r.concepto}:</b> {r.detalle}
                </span>
                {r.importe ? <span className="shrink-0 font-medium">{usd(r.importe)}</span> : null}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Informe comparativo */}
      <div className="rounded-xl border border-black/10 p-4">
        <p className="flex items-center gap-2 font-bold text-brand-black">
          <FileText className="h-4 w-4" /> Informe comparativo
        </p>
        <p className="mt-1 text-xs text-brand-black/60">Ajustá los valores, sumá comparables y aprobalo. El propietario solo lo ve cuando lo aprobás.</p>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Mínimo", minimo, setMinimo],
              ["Central", central, setCentral],
              ["Máximo", maximo, setMaximo],
              ["Publicación", publicacion, setPublicacion],
            ] as const
          ).map(([label, valor, set]) => (
            <label key={label} className="text-xs font-semibold text-brand-black/70">
              {label} (USD)
              <input value={valor} onChange={(e) => set(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={`${input} mt-1`} />
            </label>
          ))}
        </div>

        <p className="mt-4 text-xs font-semibold text-brand-black/70">Comparables (avisos de la zona)</p>
        <div className="mt-2 space-y-3">
          {comparables.map((c, i) => (
            <div key={i} className="grid gap-2 rounded-lg bg-brand-cream p-3 sm:grid-cols-[1.4fr_1.4fr_0.8fr_0.8fr_auto]">
              <input value={c.descripcion} onChange={(e) => editarComparable(i, "descripcion", e.target.value)} placeholder="Descripción (ej.: lote 600 m² Las Perdices)" maxLength={200} className={input} />
              <input value={c.fuente} onChange={(e) => editarComparable(i, "fuente", e.target.value)} placeholder="Link del aviso o fuente" maxLength={400} className={input} />
              <input value={c.precio} onChange={(e) => editarComparable(i, "precio", e.target.value.replace(/[^\d]/g, ""))} placeholder="Precio USD" inputMode="numeric" className={input} />
              <input value={c.superficie} onChange={(e) => editarComparable(i, "superficie", e.target.value.replace(/[^\d.,]/g, ""))} placeholder={`Sup. (${unidad})`} inputMode="decimal" className={input} />
              <button type="button" onClick={() => setComparables((prev) => prev.filter((_, j) => j !== i))} aria-label="Quitar comparable" className="justify-self-end text-red-600">
                <Trash2 className="h-4 w-4" />
              </button>
              {unitarioComparable(comparablesNum[i]) > 0 && (
                <p className="text-xs text-brand-black/60 sm:col-span-5">
                  {usd(Math.round(unitarioComparable(comparablesNum[i])))} por {unidad}
                </p>
              )}
            </div>
          ))}
          {comparables.length < 12 && (
            <button type="button" onClick={() => setComparables((prev) => [...prev, { descripcion: "", fuente: "", precio: "", superficie: "" }])} className={`${boton} border border-black/15 text-brand-black/80`}>
              <Plus className="h-4 w-4" /> Agregar comparable
            </button>
          )}
        </div>
        {promedio > 0 && unitario > 0 && (
          <p className="mt-3 rounded-lg bg-sky-50 px-3 py-2 text-sm text-sky-900">
            Promedio de comparables: <b>{usd(Math.round(promedio))}</b> por {unidad}. Valor central cargado: <b>{usd(Math.round(unitario))}</b> por {unidad} (
            {Math.round((unitario / promedio - 1) * 100)}% respecto del promedio).
          </p>
        )}

        <label className="mt-4 block text-xs font-semibold text-brand-black/70">
          Observaciones para el propietario
          <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={3} maxLength={4000} className={`${input} mt-1`} />
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" disabled={pendiente} onClick={() => correr(() => guardarInformeAction(t.id, informe()), "Informe guardado.")} className={`${boton} border border-brand-green-700 text-brand-green-700`}>
            {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar borrador
          </button>
          <a href={`/api/admin/tasador/${t.id}/pdf`} target="_blank" rel="noopener noreferrer" className={`${boton} border border-black/15 text-brand-black/80`}>
            <FileText className="h-4 w-4" /> Ver PDF (último guardado)
          </a>
          <button type="button" disabled={pendiente} onClick={aprobar} className={`${boton} bg-brand-green-700 text-white`}>
            Aprobar y generar link
          </button>
        </div>

        {link && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm">
            <p className="font-semibold text-emerald-900">Informe aprobado{t.informeAprobadoEn ? ` el ${fecha(t.informeAprobadoEn)}` : ""}</p>
            <p className="mt-1 break-all font-mono text-xs text-emerald-900/80">{link}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <a href={buildWhatsappClienteUrl(t.telefono, mensajeInforme)} target="_blank" rel="noopener noreferrer" className={`${boton} bg-[#25d366] text-white`}>
                <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
              </a>
              <button type="button" onClick={() => navigator.clipboard?.writeText(link).then(() => setAviso("Link copiado."))} className={`${boton} border border-black/15 text-brand-black/80`}>
                <Copy className="h-4 w-4" /> Copiar link
              </button>
              <button
                type="button"
                disabled={pendiente}
                onClick={() => {
                  if (!confirm("¿Dar de baja el link? El propietario deja de ver el informe.")) return;
                  setLink(null);
                  correr(() => retirarInformeAction(t.id), "Link dado de baja.");
                }}
                className={`${boton} text-red-700`}
              >
                Dar de baja
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Autorización de venta */}
      <AutorizacionForm t={t} precioSugerido={aNumero(publicacion)} valorTasacion={aNumero(central)} />

      {/* Notas internas */}
      <div>
        <label className="block text-xs font-semibold text-brand-black/70">
          Notas internas
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} maxLength={4000} className={`${input} mt-1`} />
        </label>
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          <button type="button" disabled={pendiente || notas === (t.notas ?? "")} onClick={() => correr(() => actualizarTasacionAction(t.id, { notas }), "Notas guardadas.")} className={`${boton} border border-black/15 text-brand-black/80`}>
            Guardar notas
          </button>
          {puedeEliminar && (
            <button
              type="button"
              disabled={pendiente}
              onClick={() => {
                if (confirm(`¿Eliminar el pedido de ${t.nombre}? No se puede deshacer.`)) correr(() => eliminarTasacionAction(t.id));
              }}
              className={`${boton} text-red-700`}
            >
              <Trash2 className="h-4 w-4" /> Eliminar pedido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Contrato: tasación y autorización de venta ───────────── */

function AutorizacionForm({ t, precioSugerido, valorTasacion }: { t: Fila; precioSugerido: number; valorTasacion: number }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emitida, setEmitida] = useState<string | null>(null);
  const [verClausulas, setVerClausulas] = useState(false);
  const [clausulasEditadas, setClausulasEditadas] = useState<string | null>(null);
  const [f, setF] = useState({
    clienteNombre: t.nombre,
    clienteDni: "",
    clienteEmail: t.email ?? "",
    clienteTelefono: t.telefono,
    domicilioPropietario: "",
    inmueble: descripcionInmueble(t),
    precio: String(precioSugerido || ""),
    plazoDias: "180",
    honorariosPct: "3",
    exclusiva: true,
    aceptaHabilitada: true,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((prev) => ({ ...prev, [k]: v }));

  const clausulasBase = clausulasAutorizacion({ exclusiva: f.exclusiva, plazoDias: Number(f.plazoDias) || 180, honorariosPct: aNumero(f.honorariosPct) || 3 });
  const clausulas = clausulasEditadas ?? clausulasBase;

  const emitir = () => {
    if (!confirm(`¿Emitir la autorización de venta de ${f.clienteNombre}? Se le asigna número y se genera el PDF definitivo (no se puede editar después, solo anular).`)) return;
    startTransition(async () => {
      setError(null);
      const r = await emitirAutorizacionVentaAction({
        clienteNombre: f.clienteNombre,
        clienteDni: f.clienteDni,
        clienteEmail: f.clienteEmail,
        clienteTelefono: f.clienteTelefono,
        domicilioPropietario: f.domicilioPropietario,
        inmueble: f.inmueble,
        precio: f.precio,
        moneda: "USD",
        valorTasacion: String(valorTasacion || ""),
        plazoDias: f.plazoDias,
        honorariosPct: f.honorariosPct,
        exclusiva: f.exclusiva ? "1" : "0",
        aceptaHabilitada: f.aceptaHabilitada ? "1" : "0",
        clausulas,
        tasacionId: t.id,
      });
      if (!r.ok) return setError(r.error);
      setEmitida(r.numero);
      setAbierto(false);
      router.refresh();
    });
  };

  const campo = "block text-xs font-semibold text-brand-black/70";

  return (
    <div className="rounded-xl border border-black/10 p-4">
      <p className="flex items-center gap-2 font-bold text-brand-black">
        <FileSignature className="h-4 w-4" /> Tasación y autorización de venta
      </p>

      {(t.doc || emitida) && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Autorización <b>{emitida ?? t.doc?.numero}</b>
          {t.doc && !emitida ? ` (${ETIQUETA_DOC[t.doc.estado] ?? t.doc.estado})` : " emitida"}. Enviala por mail o WhatsApp y seguí la firma desde{" "}
          <Link href="/admin/documentos-clientes" className="font-semibold underline">
            Reservas y certificados
          </Link>
          .
        </p>
      )}

      {!abierto ? (
        <button type="button" onClick={() => setAbierto(true)} className={`${boton} mt-3 bg-brand-black text-white`}>
          <FileSignature className="h-4 w-4" /> {t.doc || emitida ? "Emitir otra autorización" : "Preparar autorización de venta"}
        </button>
      ) : (
        <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={campo}>
              Propietario *
              <input value={f.clienteNombre} onChange={(e) => set("clienteNombre", e.target.value)} maxLength={160} className={`${input} mt-1`} />
            </label>
            <label className={campo}>
              DNI
              <input value={f.clienteDni} onChange={(e) => set("clienteDni", e.target.value)} maxLength={20} inputMode="numeric" className={`${input} mt-1`} />
            </label>
            <label className={campo}>
              Email {f.aceptaHabilitada ? "*" : ""}
              <input value={f.clienteEmail} onChange={(e) => set("clienteEmail", e.target.value)} maxLength={200} inputMode="email" className={`${input} mt-1`} />
            </label>
            <label className={campo}>
              Teléfono
              <input value={f.clienteTelefono} onChange={(e) => set("clienteTelefono", e.target.value)} maxLength={40} className={`${input} mt-1`} />
            </label>
            <label className={`${campo} sm:col-span-2`}>
              Domicilio del propietario
              <input value={f.domicilioPropietario} onChange={(e) => set("domicilioPropietario", e.target.value)} maxLength={300} className={`${input} mt-1`} />
            </label>
            <label className={`${campo} sm:col-span-2`}>
              Inmueble * (dirección, partido, nomenclatura catastral o partida si la tenés)
              <textarea value={f.inmueble} onChange={(e) => set("inmueble", e.target.value)} rows={2} maxLength={400} className={`${input} mt-1`} />
            </label>
            <label className={campo}>
              Precio de venta (USD) *
              <input value={f.precio} onChange={(e) => set("precio", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={`${input} mt-1`} />
            </label>
            <label className={campo}>
              Plazo (días)
              <input value={f.plazoDias} onChange={(e) => set("plazoDias", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" className={`${input} mt-1`} />
            </label>
            <label className={campo}>
              Honorarios del vendedor (%)
              <input value={f.honorariosPct} onChange={(e) => set("honorariosPct", e.target.value.replace(/[^\d.,]/g, ""))} inputMode="decimal" className={`${input} mt-1`} />
            </label>
          </div>

          <label className="flex items-start gap-2 text-sm text-brand-black/80">
            <input type="checkbox" checked={f.exclusiva} onChange={(e) => set("exclusiva", e.target.checked)} className="mt-1 h-4 w-4" />
            <span>
              Autorización <b>exclusiva</b>
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-brand-black/80">
            <input type="checkbox" checked={f.aceptaHabilitada} onChange={(e) => set("aceptaHabilitada", e.target.checked)} className="mt-1 h-4 w-4" />
            <span>
              El propietario la <b>firma online</b> desde su enlace (con un código que le llega por mail). Si lo destildás, el PDF sale con lugar para firmar en papel.
            </span>
          </label>

          <button type="button" onClick={() => setVerClausulas(!verClausulas)} className="text-sm font-semibold text-brand-green-700 underline">
            {verClausulas ? "Ocultar cláusulas" : "Ver y editar cláusulas"}
          </button>
          {verClausulas && (
            <div>
              <textarea value={clausulas} onChange={(e) => setClausulasEditadas(e.target.value)} rows={16} maxLength={12000} className={`${input} font-mono text-xs`} />
              {clausulasEditadas !== null && (
                <button type="button" onClick={() => setClausulasEditadas(null)} className="mt-1 text-xs text-brand-black/60 underline">
                  Volver al texto modelo
                </button>
              )}
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={pendiente} onClick={emitir} className={`${boton} bg-brand-green-700 text-white`}>
              {pendiente ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSignature className="h-4 w-4" />} {pendiente ? "Emitiendo…" : "Emitir autorización"}
            </button>
            <button type="button" onClick={() => setAbierto(false)} className={`${boton} text-brand-black/60`}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────── Valores de referencia por partido ───────────── */

function ValoresZonaForm({ valores }: { valores: Record<string, ValoresZona> }) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [mensaje, setMensaje] = useState<{ partido: string; texto: string; error: boolean } | null>(null);
  const [edit, setEdit] = useState<Record<string, Record<string, string>>>(() =>
    Object.fromEntries(PARTIDOS.map((p) => [p.slug, Object.fromEntries(CAMPOS_VALOR.map(({ campo }) => [campo, String(valores[p.slug]?.[campo] ?? "")]))]))
  );

  const guardar = (partido: string) =>
    startTransition(async () => {
      const r = await guardarValoresZonaAction(partido, Object.fromEntries(CAMPOS_VALOR.map(({ campo }) => [campo, aNumero(edit[partido][campo])])));
      setMensaje({ partido, texto: r.ok ? "Guardado" : r.error, error: !r.ok });
      if (r.ok) router.refresh();
    });

  return (
    <div className="space-y-3">
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Estos valores son la base del tasador online. Los iniciales salen de promedios de avisos publicados (noviembre 2026); los marcados como{" "}
        <b>estimado</b> no tienen un promedio propio y conviene revisarlos primero.
      </p>
      {PARTIDOS.map((p) => (
        <div key={p.slug} className="rounded-xl bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-brand-black">
            {p.nombre} <span className="text-xs font-normal text-brand-black/50">· {p.zona.nombre}</span>
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {CAMPOS_VALOR.map(({ campo, label, unidad }) => {
              const inicial = VALORES_INICIALES[p.slug];
              const sinCambios = inicial && Number(edit[p.slug][campo]) === inicial[campo];
              const estimado = sinCambios && !inicial.relevado.includes(campo);
              return (
                <label key={campo} className="text-xs font-semibold text-brand-black/70">
                  {label} <span className="font-normal">({unidad})</span>
                  {estimado && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">estimado</span>}
                  <input
                    value={edit[p.slug][campo]}
                    onChange={(e) => setEdit((prev) => ({ ...prev, [p.slug]: { ...prev[p.slug], [campo]: e.target.value.replace(/[^\d.,]/g, "") } }))}
                    inputMode="decimal"
                    className={`${input} mt-1`}
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button type="button" disabled={pendiente} onClick={() => guardar(p.slug)} className={`${boton} bg-brand-green-700 text-white`}>
              <Save className="h-4 w-4" /> Guardar
            </button>
            {mensaje?.partido === p.slug && <span className={`text-sm ${mensaje.error ? "text-red-700" : "text-emerald-700"}`}>{mensaje.texto}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
