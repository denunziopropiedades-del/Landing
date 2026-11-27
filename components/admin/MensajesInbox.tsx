"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bot, Archive, Check, CheckCheck, Clock, MessageCircle, Plus, Search, Send, Trash2, X } from "lucide-react";
import {
  archivarConversacionAction,
  borrarRespuestaRapidaAction,
  enviarMensajeAction,
  getBandeja,
  getConversacion,
  guardarRespuestaRapidaAction,
  type CanalBandeja,
  type ConversacionResumen,
  type FichaLead,
  type EstadoAsistenteConv,
  type MensajeBandeja,
  type RespuestaRapida,
} from "@/lib/admin/mensajes-actions";
import { descartarBorradorAction, pausarAsistenteAction } from "@/lib/admin/asistente-actions";
import { labelOrigen } from "@/lib/leads";

const ESTADOS: Record<string, { label: string; cls: string }> = {
  nuevo: { label: "Nuevo", cls: "bg-blue-100 text-blue-800" },
  contactado: { label: "Contactado", cls: "bg-purple-100 text-purple-800" },
  visita_programada: { label: "Visita programada", cls: "bg-amber-100 text-amber-800" },
  visita_realizada: { label: "Visita realizada", cls: "bg-sky-100 text-sky-800" },
  reservado: { label: "Reservado", cls: "bg-yellow-100 text-yellow-800" },
  pago_confirmado: { label: "Pago confirmado", cls: "bg-cyan-100 text-cyan-800" },
  pendiente_firma_escribania: { label: "Pend. escribanía", cls: "bg-orange-100 text-orange-800" },
  firmado_escribania: { label: "Firmado escribanía", cls: "bg-teal-100 text-teal-800" },
  vendido: { label: "Vendido", cls: "bg-green-100 text-green-800" },
  descartado: { label: "Descartado", cls: "bg-red-100 text-red-800" },
};

type Filtro = "todos" | "sin_responder" | "whatsapp" | "messenger" | "instagram" | "archivadas";

const VENTANA_MS = 24 * 60 * 60 * 1000;

function hora(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoy = new Date();
  const ayer = new Date(Date.now() - 86400000);
  const tz = { timeZone: "America/Argentina/Buenos_Aires" } as const;
  if (d.toDateString() === hoy.toDateString()) return d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", ...tz });
  if (d.toDateString() === ayer.toDateString()) return "Ayer";
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", ...tz });
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
}

function colorAvatar(id: string) {
  const colores = ["bg-brand-green-500", "bg-brand-green-600", "bg-brand-gold-600", "bg-amber-600", "bg-sky-600", "bg-brand-green-700"];
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return colores[h % colores.length];
}

function numeroLindo(n: string | null | undefined) {
  if (!n) return "";
  const d = n.replace(/\D/g, "").replace(/^549/, "");
  return d.length === 10 ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : n;
}

const ESTILO_CANAL = {
  whatsapp: { color: "bg-[#25d366]", letra: "W", chip: "bg-[#e9f9ef] text-[#128c4a]", nombre: "WhatsApp" },
  messenger: { color: "bg-[#0a7cff]", letra: "M", chip: "bg-[#e7f1ff] text-[#0a5fd1]", nombre: "Messenger" },
  instagram: { color: "bg-[#e1306c]", letra: "I", chip: "bg-[#fdeaf1] text-[#b3164f]", nombre: "Instagram" },
} as const;
const estilo = (tipo: string) => ESTILO_CANAL[tipo as keyof typeof ESTILO_CANAL] ?? ESTILO_CANAL.messenger;

function nombreCanal(c: CanalBandeja) {
  if (c.tipo === "whatsapp") return `WhatsApp ${numeroLindo(c.numero) || c.nombre}`;
  return `${estilo(c.tipo).nombre} · ${c.nombre}`;
}

function PuntoCanal({ tipo, className = "" }: { tipo: string; className?: string }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${estilo(tipo).color} ${className}`} />;
}

function Avatar({ c }: { c: ConversacionResumen }) {
  return (
    <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${colorAvatar(c.id)}`}>
      {iniciales(c.nombre || c.telefono || "?")}
      <span
        className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white text-[8px] font-black ${
          estilo(c.canal.tipo).color
        }`}
      >
        {estilo(c.canal.tipo).letra}
      </span>
    </div>
  );
}

function Adjunto({ m }: { m: MensajeBandeja }) {
  const src = m.mediaId ? `/api/admin/mensajes/media/${m.mediaId}` : m.mediaUrl;
  if (!src) return null;
  if (m.tipo === "image" || m.tipo === "sticker")
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="Foto del cliente" className="mb-1 max-h-64 rounded-lg object-cover" />;
  if (m.tipo === "audio") return <audio controls src={src} className="mb-1 max-w-full" />;
  if (m.tipo === "video") return <video controls src={src} className="mb-1 max-h-64 rounded-lg" />;
  return (
    <a href={src} target="_blank" rel="noreferrer" className="mb-1 inline-block font-semibold text-brand-green-700 underline">
      📄 Abrir archivo
    </a>
  );
}

function EstadoEnvio({ m }: { m: MensajeBandeja }) {
  if (m.direccion !== "saliente") return null;
  if (m.estado === "error") return <span className="font-semibold text-red-600">No se entregó</span>;
  if (m.estado === "leido") return <CheckCheck className="inline h-3.5 w-3.5 text-sky-600" />;
  if (m.estado === "entregado") return <CheckCheck className="inline h-3.5 w-3.5" />;
  return <Check className="inline h-3.5 w-3.5" />;
}

export default function MensajesInbox({
  conversacionesIniciales,
  canalesIniciales,
  respuestasIniciales,
  puedeEditarRespuestas,
}: {
  conversacionesIniciales: ConversacionResumen[];
  canalesIniciales: CanalBandeja[];
  respuestasIniciales: RespuestaRapida[];
  puedeEditarRespuestas: boolean;
}) {
  const [conversaciones, setConversaciones] = useState(conversacionesIniciales);
  const [canales, setCanales] = useState(canalesIniciales);
  const [respuestas, setRespuestas] = useState(respuestasIniciales);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [canalFiltro, setCanalFiltro] = useState<string>("");
  const [buscar, setBuscar] = useState("");
  const [abiertaId, setAbiertaId] = useState<string | null>(conversacionesIniciales.find((c) => !c.archivada)?.id ?? null);
  const [mensajes, setMensajes] = useState<MensajeBandeja[]>([]);
  const [lead, setLead] = useState<FichaLead | null>(null);
  const [asistente, setAsistente] = useState<EstadoAsistenteConv | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, startEnvio] = useTransition();
  const [editandoRespuestas, setEditandoRespuestas] = useState(false);
  const [nuevaResp, setNuevaResp] = useState({ titulo: "", texto: "" });
  const finChat = useRef<HTMLDivElement>(null);
  const [verLista, setVerLista] = useState(true); // celular: lista o chat

  const abierta = conversaciones.find((c) => c.id === abiertaId) ?? null;

  const refrescarLista = useCallback(async () => {
    const r = await getBandeja();
    setConversaciones(r.conversaciones);
    setCanales(r.canales);
  }, []);

  const cargarChat = useCallback(async (id: string) => {
    const r = await getConversacion(id);
    setMensajes(r.mensajes);
    setLead(r.lead);
    setAsistente(r.asistente ?? null);
  }, []);

  // Actualiza la lista y el chat abierto cada pocos segundos.
  useEffect(() => {
    const t = setInterval(() => {
      if (document.hidden) return;
      refrescarLista();
      if (abiertaId) cargarChat(abiertaId);
    }, 6000);
    return () => clearInterval(t);
  }, [abiertaId, refrescarLista, cargarChat]);

  useEffect(() => {
    if (!abiertaId) return;
    setMensajes([]);
    setLead(null);
    setError(null);
    cargarChat(abiertaId).then(() => {
      setConversaciones((prev) => prev.map((c) => (c.id === abiertaId ? { ...c, noLeidos: 0 } : c)));
    });
  }, [abiertaId, cargarChat]);

  useEffect(() => {
    finChat.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length, abiertaId]);

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return conversaciones.filter((c) => {
      if (filtro === "archivadas" ? !c.archivada : c.archivada) return false;
      if (filtro === "sin_responder" && c.noLeidos === 0) return false;
      if (filtro === "whatsapp" && c.canal.tipo !== "whatsapp") return false;
      if (filtro === "messenger" && c.canal.tipo !== "messenger") return false;
      if (filtro === "instagram" && c.canal.tipo !== "instagram") return false;
      if (canalFiltro && c.canal.id !== canalFiltro) return false;
      if (q && !`${c.nombre} ${c.telefono ?? ""} ${c.etiqueta ?? ""} ${c.ultimoTexto}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [conversaciones, filtro, canalFiltro, buscar]);

  const sinResponder = conversaciones.filter((c) => c.noLeidos > 0 && !c.archivada).length;
  const ventanaAbierta = !!abierta?.ultimoEntranteEn && Date.now() - new Date(abierta.ultimoEntranteEn).getTime() < VENTANA_MS;

  const enviar = () => {
    if (!abierta || !texto.trim()) return;
    const t = texto;
    setError(null);
    startEnvio(async () => {
      const r = await enviarMensajeAction(abierta.id, t);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setTexto("");
      setMensajes((prev) => [...prev, r.mensaje]);
      setConversaciones((prev) =>
        prev.map((c) => (c.id === abierta.id ? { ...c, ultimoTexto: t, ultimoMensajeEn: r.mensaje.creadoEn, noLeidos: 0 } : c))
      );
    });
  };

  const usarBorrador = async () => {
    if (!abierta || !asistente?.borrador) return;
    setTexto(asistente.borrador);
    setAsistente({ ...asistente, borrador: null });
    await descartarBorradorAction(abierta.id);
  };
  const descartarBorrador = async () => {
    if (!abierta || !asistente) return;
    setAsistente({ ...asistente, borrador: null });
    await descartarBorradorAction(abierta.id);
  };
  const alternarAsistente = async () => {
    if (!abierta || !asistente) return;
    const pausado = !asistente.pausado;
    const r = await pausarAsistenteAction(abierta.id, pausado);
    if (!r.ok) return alert(r.error);
    setAsistente({ ...asistente, pausado, atencion: pausado ? asistente.atencion : null });
  };

  const archivar = async () => {
    if (!abierta) return;
    const r = await archivarConversacionAction(abierta.id, !abierta.archivada);
    if (!r.ok) return alert(r.error);
    setConversaciones((prev) => prev.map((c) => (c.id === abierta.id ? { ...c, archivada: !c.archivada, noLeidos: 0 } : c)));
  };

  const agregarRespuesta = async () => {
    const r = await guardarRespuestaRapidaAction(nuevaResp.titulo, nuevaResp.texto);
    if (!r.ok) return alert(r.error);
    setRespuestas((prev) => [...prev, r.respuesta]);
    setNuevaResp({ titulo: "", texto: "" });
  };

  const borrarRespuesta = async (id: string) => {
    if (!confirm("¿Borrar esta respuesta rápida?")) return;
    const r = await borrarRespuestaRapidaAction(id);
    if (!r.ok) return alert(r.error);
    setRespuestas((prev) => prev.filter((x) => x.id !== id));
  };

  const chips: { v: Filtro; label: string }[] = [
    { v: "todos", label: "Todos" },
    { v: "sin_responder", label: `Sin responder${sinResponder ? ` (${sinResponder})` : ""}` },
    { v: "whatsapp", label: "WhatsApp" },
    { v: "messenger", label: "Messenger" },
    { v: "instagram", label: "Instagram" },
    { v: "archivadas", label: "Archivadas" },
  ];

  return (
    <div className="space-y-4">
      {/* Canales conectados */}
      <div className="flex flex-wrap gap-2">
        {canales.length === 0 && (
          <span className="rounded-full border border-dashed border-black/15 bg-white px-3 py-1.5 text-xs text-brand-black/60">
            Todavía no llegó ningún mensaje. Los números y la página aparecen acá solos con el primer mensaje.
          </span>
        )}
        {canales.map((c) => (
          <button
            key={c.id}
            onClick={() => setCanalFiltro(canalFiltro === c.id ? "" : c.id)}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              canalFiltro === c.id ? "border-brand-black bg-brand-black text-white" : "border-black/10 bg-white text-brand-black"
            }`}
          >
            <PuntoCanal tipo={c.tipo} />
            {nombreCanal(c)}
          </button>
        ))}
      </div>

      <div className="flex h-[calc(100vh-13rem)] min-h-[520px] overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
        {/* Lista de conversaciones */}
        <div className={`${verLista ? "flex" : "hidden"} w-full flex-col border-r border-black/5 md:flex md:w-80 lg:w-96`}>
          <div className="flex flex-wrap gap-1.5 p-3">
            {chips.map((ch) => (
              <button
                key={ch.v}
                onClick={() => setFiltro(ch.v)}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  filtro === ch.v ? "bg-brand-black text-white" : "bg-brand-green-50 text-brand-green-600"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
          <div className="relative mx-3 mb-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-brand-black/40" />
            <input
              value={buscar}
              onChange={(e) => setBuscar(e.target.value)}
              placeholder="Buscar por nombre, teléfono o propiedad…"
              className="w-full rounded-lg border border-black/10 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-green-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {lista.length === 0 && <p className="p-6 text-center text-sm text-brand-black/50">No hay conversaciones con ese filtro.</p>}
            {lista.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setAbiertaId(c.id);
                  setVerLista(false);
                }}
                className={`relative flex w-full gap-3 border-t border-black/5 px-3 py-3 text-left transition hover:bg-brand-cream ${
                  c.id === abiertaId ? "border-l-4 border-l-brand-gold-500 bg-brand-green-50" : ""
                }`}
              >
                <Avatar c={c} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <b className="truncate text-sm text-brand-black">{c.nombre || numeroLindo(c.telefono) || "Sin nombre"}</b>
                    <small className="shrink-0 text-[11px] text-brand-black/50">{hora(c.ultimoMensajeEn)}</small>
                  </div>
                  <p className={`truncate text-[13px] ${c.noLeidos ? "font-semibold text-brand-black" : "text-brand-black/60"}`}>{c.ultimoTexto}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {c.etiqueta && <span className="rounded-md bg-brand-gold-100 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-gold-700">{c.etiqueta}</span>}
                    <span className="rounded-md bg-brand-green-50 px-1.5 py-0.5 text-[10.5px] font-bold text-brand-green-600">
                      {c.canal.tipo === "whatsapp" ? numeroLindo(c.canal.numero) || "WhatsApp" : estilo(c.canal.tipo).nombre}
                    </span>
                  </div>
                </div>
                {c.noLeidos > 0 && (
                  <span
                    className={`absolute bottom-3 right-3 rounded-full px-1.5 text-[11px] font-extrabold text-white ${estilo(c.canal.tipo).color}`}
                  >
                    {c.noLeidos}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className={`${verLista ? "hidden" : "flex"} min-w-0 flex-1 flex-col bg-brand-cream md:flex`}>
          {!abierta ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-brand-black/50">
              <MessageCircle className="h-10 w-10" />
              <p className="text-sm">Elegí una conversación</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-black/5 bg-white px-4 py-3">
                <button onClick={() => setVerLista(true)} className="text-sm font-semibold text-brand-green-700 md:hidden">
                  ← Volver
                </button>
                <Avatar c={abierta} />
                <div className="min-w-0">
                  <b className="block truncate text-[15px] text-brand-black">{abierta.nombre || numeroLindo(abierta.telefono) || "Sin nombre"}</b>
                  <small className="text-xs text-brand-black/60">{abierta.telefono ? `+${abierta.telefono.replace(/\D/g, "")}` : estilo(abierta.canal.tipo).nombre}</small>
                </div>
                <span
                  className={`ml-auto hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${estilo(abierta.canal.tipo).chip}`}
                >
                  <PuntoCanal tipo={abierta.canal.tipo} />
                  Entró por {nombreCanal(abierta.canal)}
                </span>
                {asistente && (
                  <button
                    onClick={alternarAsistente}
                    title={asistente.pausado ? "El asistente no responde en este chat. Tocá para reactivarlo." : "Tocá para pausar el asistente en este chat"}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${asistente.pausado ? "bg-black/5 text-brand-black/50" : "bg-[#e9f9ef] text-[#128c4a]"}`}
                  >
                    <Bot className="h-3.5 w-3.5" />
                    {asistente.pausado ? "IA pausada" : "IA activa"}
                  </button>
                )}
                <button onClick={archivar} title={abierta.archivada ? "Desarchivar" : "Archivar"} className="rounded-lg p-2 text-brand-black/50 hover:bg-brand-cream">
                  <Archive className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4 sm:px-8">
                {mensajes.map((m) => (
                  <div key={m.id} className={`flex ${m.direccion === "saliente" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.8px] leading-snug shadow-sm sm:max-w-[62%] ${
                        m.direccion === "saliente" ? "rounded-br-md bg-[#dcf5c8]" : "rounded-bl-md bg-white"
                      }`}
                    >
                      <Adjunto m={m} />
                      {m.texto && <p className="whitespace-pre-wrap break-words">{m.texto}</p>}
                      <p className="mt-0.5 flex items-center justify-end gap-1 text-[10.5px] text-brand-black/50">
                        {m.direccion === "saliente" &&
                          (m.enviadoDesde === "asistente" ? "🤖 asistente ·" : m.enviadoDesde === "celular" ? "desde el celular ·" : m.enviadoPor ? `${m.enviadoPor} ·` : "")}
                        {hora(m.creadoEn)} <EstadoEnvio m={m} />
                      </p>
                      {m.estado === "error" && m.error && <p className="mt-1 text-[11px] text-red-600">{m.error}</p>}
                    </div>
                  </div>
                ))}
                <div ref={finChat} />
              </div>

              {/* Respuestas rápidas */}
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {respuestas.map((r) => (
                  <span key={r.id} className="flex items-center rounded-full border border-black/10 bg-white text-xs font-semibold text-brand-green-600">
                    <button onClick={() => setTexto((t) => (t ? `${t}\n${r.texto}` : r.texto))} className="px-3 py-1.5" title={r.texto}>
                      {r.titulo}
                    </button>
                    {editandoRespuestas && (
                      <button onClick={() => borrarRespuesta(r.id)} className="pr-2 text-red-500" title="Borrar">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {puedeEditarRespuestas && (
                  <button
                    onClick={() => setEditandoRespuestas((v) => !v)}
                    className="rounded-full border border-dashed border-black/20 px-3 py-1.5 text-xs font-semibold text-brand-black/60"
                  >
                    {editandoRespuestas ? <X className="inline h-3.5 w-3.5" /> : <Plus className="inline h-3.5 w-3.5" />} Respuestas
                  </button>
                )}
              </div>
              {editandoRespuestas && (
                <div className="mx-4 mb-2 flex flex-col gap-2 rounded-lg border border-black/10 bg-white p-3 sm:flex-row">
                  <input
                    value={nuevaResp.titulo}
                    onChange={(e) => setNuevaResp({ ...nuevaResp, titulo: e.target.value })}
                    placeholder="Título (ej. 💲 Precios)"
                    className="rounded-md border border-black/10 px-2 py-1.5 text-sm sm:w-44"
                  />
                  <input
                    value={nuevaResp.texto}
                    onChange={(e) => setNuevaResp({ ...nuevaResp, texto: e.target.value })}
                    placeholder="Texto que se pega en el mensaje"
                    className="flex-1 rounded-md border border-black/10 px-2 py-1.5 text-sm"
                  />
                  <button onClick={agregarRespuesta} className="rounded-md bg-brand-black px-3 py-1.5 text-sm font-semibold text-white">
                    Agregar
                  </button>
                </div>
              )}

              {asistente?.atencion && (
                <p className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <Bot className="h-4 w-4 shrink-0" />
                  {asistente.atencion === "reserva" ? "El cliente quiere reservar: enviale el link de la seña." : `El asistente pidió un asesor: ${asistente.atencion}`}
                </p>
              )}
              {asistente?.borrador && ventanaAbierta && (
                <div className="mx-4 mb-2 rounded-lg border border-[#25d366]/40 bg-white p-3">
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-[#128c4a]">
                    <Bot className="h-3.5 w-3.5" /> Respuesta sugerida por el asistente
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-brand-black/80">{asistente.borrador}</p>
                  <div className="mt-2 flex gap-2">
                    <button onClick={usarBorrador} className="rounded-md bg-[#25d366] px-3 py-1 text-xs font-bold text-white">
                      Usar (podés editarla)
                    </button>
                    <button onClick={descartarBorrador} className="rounded-md px-3 py-1 text-xs font-semibold text-brand-black/60">
                      Descartar
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
              {!ventanaAbierta && (
                <p className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <Clock className="h-4 w-4 shrink-0" />
                  Pasaron más de 24 h desde el último mensaje del cliente. Meta no deja responder desde acá: escribile desde el celular.
                </p>
              )}

              <div className="mx-4 mb-4 flex items-end gap-2 rounded-xl border border-black/10 bg-white p-2">
                <textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      enviar();
                    }
                  }}
                  rows={Math.min(5, Math.max(1, texto.split("\n").length))}
                  placeholder={ventanaAbierta ? "Escribí tu respuesta… (Enter envía, Shift+Enter baja de línea)" : "Respondé desde el celular"}
                  disabled={!ventanaAbierta}
                  className="max-h-40 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none disabled:opacity-50"
                />
                <span
                  className={`hidden whitespace-nowrap rounded-md px-2 py-1 text-xs font-semibold lg:inline ${estilo(abierta.canal.tipo).chip}`}
                >
                  Desde {abierta.canal.tipo === "whatsapp" ? numeroLindo(abierta.canal.numero) || "WhatsApp" : estilo(abierta.canal.tipo).nombre}
                </span>
                <button
                  onClick={enviar}
                  disabled={enviando || !texto.trim() || !ventanaAbierta}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-black px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                  {enviando ? "Enviando…" : "Enviar"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Ficha del cliente */}
        {abierta && (
          <div className="hidden w-80 shrink-0 flex-col gap-4 overflow-y-auto border-l border-black/5 p-5 xl:flex">
            <h3 className="text-xs font-bold uppercase tracking-wide text-brand-black/50">Ficha del cliente</h3>
            {!lead ? (
              <p className="text-sm text-brand-black/60">
                {abierta.leadId ? "Cargando…" : "Esta conversación todavía no tiene ficha en el CRM."}
              </p>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <Avatar c={abierta} />
                  <div className="min-w-0">
                    <b className="block truncate text-base text-brand-black">{lead.nombre}</b>
                    <small className="text-xs text-brand-black/60">{lead.telefono || lead.email || "Sin teléfono"}</small>
                    <br />
                    <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${ESTADOS[lead.estado]?.cls ?? "bg-gray-100"}`}>
                      {ESTADOS[lead.estado]?.label ?? lead.estado}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 rounded-lg border border-black/5 p-3 text-[13px]">
                  <Fila k="Desarrollo" v={lead.proyecto ?? "—"} />
                  <Fila k="Origen" v={labelOrigen(lead.origen)} />
                  {lead.utmCampaign && <Fila k="Campaña" v={lead.utmCampaign} />}
                  <Fila k="Asignado a" v={lead.asignado ?? "Sin asignar"} />
                  <Fila k="En el CRM desde" v={new Date(lead.creadoEn).toLocaleDateString("es-AR")} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a href={`/admin/crm#lead-${lead.id}`} className="rounded-lg bg-brand-gold-500 px-2 py-2 text-center text-xs font-bold text-brand-black">
                    Ver en CRM
                  </a>
                  <a href="/admin/consultas" className="rounded-lg bg-brand-black px-2 py-2 text-center text-xs font-bold text-white">
                    🗓 Visitas
                  </a>
                </div>
                {lead.observaciones && (
                  <div>
                    <h3 className="mb-1 text-xs font-bold uppercase tracking-wide text-brand-black/50">Notas</h3>
                    <p className="whitespace-pre-wrap text-xs text-brand-black/70">{lead.observaciones}</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Fila({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-brand-black/55">{k}</span>
      <b className="text-right font-semibold text-brand-black">{v}</b>
    </div>
  );
}
