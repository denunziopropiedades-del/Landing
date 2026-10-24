"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Copy, Download, FilePlus2, FileText, History, Loader2, Pencil, Save, Trash2, Upload, UserRound, Wand2, X } from "lucide-react";
import {
  eliminarDocumentoAction,
  eliminarModeloAction,
  guardarModeloAction,
  registrarDocumentoAction,
  type ClienteParaDocumento,
  type DocumentoGenerado,
} from "@/lib/admin/documentos-actions";
import { camposDe, contarBlancos, contarPorcentajes, convertirBlancos, convertirPorcentajes, formatearValor, nombreArchivo, sugerencias, type Campo, type Modelo } from "@/lib/documentos/plantillas";
import { textoDeDocx } from "@/lib/documentos/docx";

const input = "w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const label = "mb-1 block text-xs font-medium text-brand-black/70";
const CLAVE_PROF = "denunzio-datos-profesional";

type Profesional = { nombre: string; titulo: string; matricula: string; domicilio: string; telefono: string; email: string };
const PROF_INICIAL: Profesional = {
  nombre: "Matías De Nunzio",
  titulo: "Martillero Público",
  matricula: "",
  domicilio: "",
  telefono: "11-6136-5523",
  email: "",
};

function datosProfesional(p: Profesional): Record<string, string> {
  const d: Record<string, string> = {
    "Nombre del perito": p.nombre,
    "Nombre del martillero": p.nombre,
    Martillero: p.nombre,
    Corredor: p.nombre,
    "Especialidad del perito": p.titulo.replace(/^martillero p[uú]blico$/i, "Martillero"),
    Matrícula: p.matricula,
    "Matrícula del martillero": p.matricula,
    "Domicilio constituido": p.domicilio,
    "Domicilio del martillero": p.domicilio,
    "Teléfono de contacto": p.telefono,
    Teléfono: p.telefono,
    "Email de contacto": p.email,
    Inmobiliaria: "De Nunzio Negocios Inmobiliarios",
    "Fecha de hoy": new Date().toISOString().slice(0, 10),
    Fecha: new Date().toISOString().slice(0, 10),
  };
  for (const k of Object.keys(d)) if (!d[k]) delete d[k];
  return d;
}

/* ── Vista previa en HTML (aproxima el PDF) ─────────────────────────────── */
function Vista({ cuerpo, valores, campos, firma }: { cuerpo: string; valores: Record<string, string>; campos: Campo[]; firma: Profesional }) {
  const porClave = new Map(campos.map((c) => [c.clave, c]));
  const html = useMemo(() => {
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
    let t = esc(cuerpo);
    t = t.replace(/\{\{\s*([^{}|=]+?)\s*(?:\|([^{}=]*?))?(?:=([^{}]*?))?\s*\}\}/g, (_x, et: string, tipoOc: string | undefined, def: string | undefined) => {
      const c = porClave.get(et.trim().toLowerCase());
      const v = valores[et.trim().toLowerCase()] || def || c?.porDefecto || "";
      const txt = v ? esc(formatearValor(tipoOc?.trim().toLowerCase() || c?.tipo || "texto", v)) : "________________";
      return `<mark class="${v ? "lleno" : "vacio"}" title="${esc(et.trim())}">${txt}</mark>`;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    return t
      .split(/\n{2,}/)
      .map((p) =>
        p.trim() === "[FIRMA]"
          ? `<div class="firma"><span></span>Firma y sello<b>${esc(firma.nombre)}</b>${esc([firma.titulo, firma.matricula ? `Mat. N.º ${firma.matricula}` : ""].filter(Boolean).join(" · "))}</div>`
          : `<p>${p.replace(/\n/g, "<br>")}</p>`
      )
      .join("");
  }, [cuerpo, valores, firma]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div
      className="hoja mx-auto w-full max-w-[640px] bg-white px-10 py-12 font-serif text-[15px] leading-[1.75] text-black shadow-md [&_mark.lleno]:bg-green-100 [&_mark.vacio]:bg-amber-100 [&_mark]:rounded-sm [&_mark]:px-0.5 [&_p]:mb-4 [&_p]:text-justify [&_.firma]:ml-auto [&_.firma]:mt-14 [&_.firma]:flex [&_.firma]:w-56 [&_.firma]:flex-col [&_.firma]:items-center [&_.firma]:text-center [&_.firma]:text-xs [&_.firma_span]:mb-1 [&_.firma_span]:w-full [&_.firma_span]:border-t [&_.firma_span]:border-black"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/* ── Editor de modelos ──────────────────────────────────────────────────── */
function EditorModelo({ modelo, onCerrar, onGuardado }: { modelo?: Modelo; onCerrar: () => void; onGuardado: (id: string) => void }) {
  const [nombre, setNombre] = useState(modelo && !modelo.incorporado ? modelo.nombre : modelo ? `${modelo.nombre} (copia)` : "");
  const [categoria, setCategoria] = useState(modelo?.categoria ?? "Contratos");
  const [cuerpo, setCuerpo] = useState(modelo?.cuerpo ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const archivo = useRef<HTMLInputElement>(null);
  const campos = camposDe(cuerpo);
  const xs = contarBlancos(cuerpo) + contarPorcentajes(cuerpo);
  const [aviso, setAviso] = useState<string | null>(null);

  const subir = async (f: File) => {
    setError(null);
    try {
      const texto = /\.docx$/i.test(f.name) ? await textoDeDocx(f) : await f.text();
      // Los espacios para completar del Word ("_____" o "XXXX") se convierten solos en campos.
      const convertido = convertirPorcentajes(convertirBlancos(texto));
      setCuerpo(convertido);
      const total = camposDe(convertido).length;
      setAviso(
        total > 0
          ? `Se detectaron ${total} campos para completar. Revisá los nombres a la derecha y renombralos si querés.`
          : "El archivo no tiene espacios para completar. Podés marcar los datos que cambian entre llaves dobles, por ejemplo {{Nombre del cliente}}, o guardarlo así como modelo fijo.",
      );
      if (!nombre) setNombre(f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo leer el archivo.");
    }
  };

  const convertirXs = () => setCuerpo((c) => convertirPorcentajes(convertirBlancos(c)));

  const renombrar = (c: Campo, nuevo: string) => {
    const limpio = nuevo.replace(/[{}|=]/g, "").trim();
    if (!limpio || limpio.toLowerCase() === c.clave) return;
    const re = new RegExp(`\\{\\{\\s*${c.etiqueta.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*((?:\\|[^{}=]*)?(?:=[^{}]*)?)\\}\\}`, "gi");
    setCuerpo((b) => b.replace(re, (_m, resto: string) => `{{${limpio}${resto ?? ""}}}`));
  };

  const guardar = () =>
    start(async () => {
      setError(null);
      // Si pegaron el texto sin convertir, los espacios en blanco ("……", "____", "XXXX") se convierten solos al guardar.
      const final = camposDe(cuerpo).length > 0 ? cuerpo : convertirPorcentajes(convertirBlancos(cuerpo));
      if (final !== cuerpo) setCuerpo(final);
      const r = await guardarModeloAction({ id: modelo && !modelo.incorporado ? modelo.id : undefined, nombre, categoria, cuerpo: final });
      if (!r.ok) setError(r.error);
      else onGuardado(r.data.id);
    });

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">{modelo && !modelo.incorporado ? "Editar modelo" : "Nuevo modelo"}</h2>
        <button type="button" onClick={onCerrar} className="rounded-lg p-1.5 hover:bg-black/5" aria-label="Cerrar">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label className={label} htmlFor="mod-nombre">Nombre del modelo</label>
          <input id="mod-nombre" className={input} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Boleto de compraventa de lote" />
        </div>
        <div>
          <label className={label} htmlFor="mod-cat">Categoría</label>
          <input id="mod-cat" className={input} value={categoria} onChange={(e) => setCategoria(e.target.value)} list="categorias-doc" />
          <datalist id="categorias-doc">
            {["Contratos", "Escritos judiciales", "Reservas y boletos", "Alquileres", "Autorizaciones de venta", "Recibos"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => archivo.current?.click()} className="inline-flex items-center gap-2 rounded-lg border border-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/5">
          <Upload className="h-4 w-4" /> Subir Word (.docx) o texto
        </button>
        <input ref={archivo} type="file" accept=".docx,.txt,text/plain" hidden onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])} />
        {xs > 0 && (
          <button type="button" onClick={convertirXs} className="inline-flex items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-200">
            <Wand2 className="h-4 w-4" /> Convertir {xs} espacios en blanco y porcentajes en campos
          </button>
        )}
      </div>

      <div className="mt-3 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <label className={label} htmlFor="mod-cuerpo">Texto del modelo</label>
          <textarea id="mod-cuerpo" className={`${input} min-h-[380px] font-mono text-[13px] leading-relaxed`} value={cuerpo} onChange={(e) => setCuerpo(e.target.value)} placeholder="Pegá acá el texto del contrato o escrito…" />
          <p className="mt-2 text-xs leading-relaxed text-brand-black/60">
            Marcá los datos variables entre llaves dobles: <code>{"{{Nombre del cliente}}"}</code>. Opcional: tipo <code>{"{{Fecha de firma|fecha}}"}</code>,{" "}
            <code>{"|hora"}</code>, <code>{"|numero"}</code>, <code>{"|porcentaje en letras"}</code>; valor por defecto <code>{"{{Localidad=La Plata}}"}</code>. <code>**texto**</code> va en negrita y una línea con{" "}
            <code>[FIRMA]</code> ubica la firma y sello.
          </p>
        </div>
        <div>
          <p className={label}>Campos detectados ({campos.length}) — podés renombrarlos</p>
          <div className="max-h-[380px] space-y-2 overflow-y-auto rounded-xl bg-brand-cream p-3">
            {campos.length === 0 && <p className="text-xs text-brand-black/50">Todavía no hay campos.</p>}
            {campos.map((c) => (
              <div key={c.clave} className="flex items-center gap-2">
                <input
                  defaultValue={c.etiqueta}
                  onBlur={(e) => renombrar(c, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                  className={`${input} py-1.5`}
                  aria-label={`Renombrar ${c.etiqueta}`}
                />
                <span className="shrink-0 rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold uppercase text-brand-black/50">{c.tipo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {aviso && !error && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-brand-green-800">{aviso}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onCerrar} className="rounded-lg px-4 py-2 text-sm font-semibold text-brand-black/60 hover:bg-black/5">
          Cancelar
        </button>
        <button type="button" onClick={guardar} disabled={pend} className="inline-flex items-center gap-2 rounded-lg bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60">
          {pend ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar modelo
        </button>
      </div>
    </div>
  );
}

/* ── Pantalla principal ─────────────────────────────────────────────────── */
export default function DocumentosManager({
  modelos,
  historial,
  clientes,
  avisoTablas,
}: {
  modelos: Modelo[];
  historial: DocumentoGenerado[];
  clientes: ClienteParaDocumento[];
  avisoTablas: string | null;
}) {
  const [modeloId, setModeloId] = useState(modelos[0]?.id ?? "");
  const [editando, setEditando] = useState<Modelo | "nuevo" | null>(null);
  const [vista, setVista] = useState<"generar" | "historial">("generar");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [clienteId, setClienteId] = useState("");
  const [prof, setProf] = useState<Profesional>(PROF_INICIAL);
  const [verProf, setVerProf] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [, start] = useTransition();

  const modelo = modelos.find((m) => m.id === modeloId) ?? modelos[0];
  const campos = useMemo(() => (modelo ? camposDe(modelo.cuerpo) : []), [modelo]);
  const cliente = clientes.find((c) => c.id === clienteId);

  useEffect(() => {
    try {
      const g = localStorage.getItem(CLAVE_PROF);
      if (g) setProf({ ...PROF_INICIAL, ...JSON.parse(g) });
    } catch {}
  }, []);
  const guardarProf = (p: Profesional) => {
    setProf(p);
    try {
      localStorage.setItem(CLAVE_PROF, JSON.stringify(p));
    } catch {}
  };

  // Al cambiar de modelo o de cliente: se completan los campos con datos del sistema (sin pisar lo escrito).
  const autocompletar = (base: Record<string, string>) => {
    const auto = sugerencias(campos, { ...datosProfesional(prof), ...(cliente?.datos ?? {}) });
    const res = { ...base };
    for (const [k, v] of Object.entries(auto)) if (!res[k]) res[k] = v;
    return res;
  };
  useEffect(() => {
    setValores((v) => autocompletar(v));
  }, [modeloId, clienteId, prof]); // eslint-disable-line react-hooks/exhaustive-deps

  const categorias = useMemo(() => {
    const g = new Map<string, Modelo[]>();
    for (const m of modelos) g.set(m.categoria, [...(g.get(m.categoria) ?? []), m]);
    return [...g.entries()];
  }, [modelos]);

  const elegirModelo = (id: string) => {
    setModeloId(id);
    setValores({});
    setVista("generar");
    setMensaje(null);
  };

  const descargar = async (opts?: { cuerpo: string; titulo: string; valores: Record<string, string>; registrar?: boolean }) => {
    const cuerpo = opts?.cuerpo ?? modelo.cuerpo;
    const titulo = opts?.titulo ?? modelo.nombre;
    const vals = opts?.valores ?? valores;
    setDescargando(true);
    setMensaje(null);
    try {
      const res = await fetch("/api/documentos/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          cuerpo,
          valores: vals,
          firma: { nombre: prof.nombre, detalle: [prof.titulo, prof.matricula ? `Mat. N.º ${prof.matricula}` : ""].filter(Boolean).join(" · ") },
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "No se pudo generar el PDF.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nombreArchivo(titulo, vals);
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      if (opts?.registrar !== false) {
        const r = await registrarDocumentoAction({ modeloId: modelo.id, modeloNombre: modelo.nombre, titulo, cuerpo, valores: vals, leadId: clienteId || null });
        setMensaje(r.ok ? "PDF descargado y guardado en el historial." : `PDF descargado. No se guardó en el historial: ${r.error}`);
      }
    } catch (e) {
      setMensaje(e instanceof Error ? e.message : "No se pudo generar el PDF.");
    } finally {
      setDescargando(false);
    }
  };

  const vacios = campos.filter((c) => !(valores[c.clave] || c.porDefecto)).length;

  return (
    <div className="space-y-4">
      {avisoTablas && <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{avisoTablas} Mientras tanto podés usar los modelos incorporados y descargar PDFs.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setVista("generar")} className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${vista === "generar" ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}>
          <FileText className="h-4 w-4" /> Generar
        </button>
        <button type="button" onClick={() => setVista("historial")} className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${vista === "historial" ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}>
          <History className="h-4 w-4" /> Historial ({historial.length})
        </button>
        <button type="button" onClick={() => setVerProf((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-brand-black/70">
          <UserRound className="h-4 w-4" /> Mis datos de firma
        </button>
        <button type="button" onClick={() => setEditando("nuevo")} className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-600">
          <FilePlus2 className="h-4 w-4" /> Nuevo modelo
        </button>
      </div>

      {verProf && (
        <div className="grid gap-3 rounded-2xl border border-black/10 bg-white p-4 sm:grid-cols-3">
          {(
            [
              ["nombre", "Nombre y apellido"],
              ["titulo", "Título"],
              ["matricula", "Matrícula N.º"],
              ["domicilio", "Domicilio constituido"],
              ["telefono", "Teléfono"],
              ["email", "Email"],
            ] as [keyof Profesional, string][]
          ).map(([k, t]) => (
            <div key={k}>
              <label className={label} htmlFor={`prof-${k}`}>{t}</label>
              <input id={`prof-${k}`} className={input} value={prof[k]} onChange={(e) => guardarProf({ ...prof, [k]: e.target.value })} />
            </div>
          ))}
          <p className="text-xs text-brand-black/55 sm:col-span-3">Se usan en la firma y sello y completan solos los campos con esos nombres. Se guardan en este navegador.</p>
        </div>
      )}

      {editando && (
        <EditorModelo
          modelo={editando === "nuevo" ? undefined : editando}
          onCerrar={() => setEditando(null)}
          onGuardado={(id) => {
            setEditando(null);
            setTimeout(() => elegirModelo(id), 300);
          }}
        />
      )}

      {vista === "historial" ? (
        <ul className="space-y-2">
          {historial.length === 0 && <li className="rounded-xl bg-white p-6 text-center text-sm text-brand-black/60">Todavía no se generaron documentos.</li>}
          {historial.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-black/5 bg-white p-3">
              <FileText className="h-5 w-5 text-brand-green-700" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{d.titulo}</p>
                <p className="text-xs text-brand-black/55">
                  {d.modeloNombre} · {new Date(d.creadoEn).toLocaleString("es-AR")} {d.creadoPor ? `· ${d.creadoPor}` : ""}
                </p>
              </div>
              <button type="button" onClick={() => descargar({ cuerpo: d.cuerpo, titulo: d.titulo, valores: d.valores, registrar: false })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-black/5">
                <Download className="h-4 w-4" /> PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  if (modelos.some((m) => m.id === d.modeloId)) setModeloId(d.modeloId);
                  setValores(d.valores);
                  setClienteId(d.leadId ?? "");
                  setVista("generar");
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-black/5"
              >
                <Pencil className="h-4 w-4" /> Editar
              </button>
              <button type="button" onClick={() => start(async () => { const r = await eliminarDocumentoAction(d.id); if (!r.ok) setMensaje(r.error); })} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Eliminar del historial">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        modelo && (
          <div className="grid gap-5 xl:grid-cols-[240px_minmax(0,1fr)_minmax(0,1.1fr)]">
            <aside className="space-y-4">
              {categorias.map(([cat, lista]) => (
                <div key={cat}>
                  <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-brand-black/45">{cat}</p>
                  <ul className="space-y-1">
                    {lista.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          onClick={() => elegirModelo(m.id)}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-semibold ${m.id === modelo.id ? "bg-brand-black text-white" : "bg-white text-brand-black/80 hover:bg-black/5"}`}
                        >
                          {m.nombre}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </aside>

            <section className="rounded-2xl border border-black/10 bg-white p-4">
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg font-bold">{modelo.nombre}</h2>
                  <p className="text-xs text-brand-black/55">{campos.length} datos · {vacios > 0 ? `${vacios} sin completar` : "todo completo"}</p>
                </div>
                <button type="button" onClick={() => setEditando(modelo)} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold hover:bg-black/5">
                  {modelo.incorporado ? <Copy className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />} {modelo.incorporado ? "Duplicar y editar" : "Editar modelo"}
                </button>
                {!modelo.incorporado && (
                  <button
                    type="button"
                    onClick={() => start(async () => { const r = await eliminarModeloAction(modelo.id); if (!r.ok) setMensaje(r.error); else elegirModelo(modelos[0].id); })}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                    aria-label="Eliminar modelo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-4">
                <label className={label} htmlFor="doc-cliente">Completar con datos de un cliente del CRM (opcional)</label>
                <select id="doc-cliente" className={input} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Sin cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {campos.map((c) => {
                  const id = `campo-${c.clave.replace(/[^a-z0-9]+/g, "-")}`;
                  // Los textos largos con un esquema por defecto (ej. el Anexo I) arrancan con ese esquema para completarlo.
                  const v = valores[c.clave] ?? (c.tipo === "texto largo" && c.porDefecto.includes("\n") ? c.porDefecto : "");
                  const props = {
                    id,
                    value: v,
                    placeholder: c.porDefecto || undefined,
                    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setValores((x) => ({ ...x, [c.clave]: e.target.value })),
                    className: `${input} ${!v && !c.porDefecto ? "border-amber-300 bg-amber-50/50" : ""}`,
                  };
                  return (
                    <div key={c.clave} className={c.tipo === "texto largo" || c.etiqueta.length > 28 ? "sm:col-span-2" : ""}>
                      <label className={label} htmlFor={id}>{c.etiqueta}</label>
                      {c.tipo === "texto largo" ? (
                        <textarea rows={Math.min(14, Math.max(3, v.split("\n").length + 1))} {...props} />
                      ) : (
                        <input type={c.tipo === "fecha" ? "date" : c.tipo === "hora" ? "time" : "text"} inputMode={c.tipo === "numero" || c.tipo === "porcentaje" ? "decimal" : undefined} {...props} />
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => descargar()}
                  disabled={descargando}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
                >
                  {descargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Descargar PDF
                </button>
                <button type="button" onClick={() => { setValores({}); setClienteId(""); setTimeout(() => setValores((v) => autocompletar(v)), 0); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-black/60 hover:bg-black/5">
                  Limpiar
                </button>
                {mensaje && <p className="text-sm text-brand-black/70">{mensaje}</p>}
              </div>
            </section>

            <section className="min-w-0 overflow-x-auto rounded-2xl bg-brand-cream p-4">
              <p className="mb-3 text-xs font-semibold text-brand-black/55">
                Vista previa · <span className="rounded bg-green-100 px-1">completado</span> <span className="rounded bg-amber-100 px-1">falta completar</span>
              </p>
              <Vista cuerpo={modelo.cuerpo} valores={valores} campos={campos} firma={prof} />
            </section>
          </div>
        )
      )}
    </div>
  );
}
