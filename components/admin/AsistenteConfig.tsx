"use client";

import { useState, useTransition } from "react";
import { Bot, Send, RotateCcw, Save } from "lucide-react";
import type { ConfigAsistente } from "@/lib/asistente/motor";
import {
  guardarConfigAsistenteAction,
  probarAsistenteAction,
  type CanalAsistente,
  type LogAsistente,
} from "@/lib/admin/asistente-actions";

const MODELOS = [
  { id: "anthropic/claude-haiku-5.5", label: "Claude Haiku 5.5 (económico, recomendado)" },
  { id: "anthropic/claude-sonnet-5.5", label: "Claude Sonnet 5.5 (mejor redacción, ~15x más caro)" },
  { id: "anthropic/claude-opus-5.5", label: "Claude Opus 5.5 (máxima calidad, más caro)" },
];

const ESTADOS = [
  { id: "nuevo", label: "Nuevo" },
  { id: "contactado", label: "Contactado" },
  { id: "visita_programada", label: "Visita programada" },
  { id: "visita_realizada", label: "Visita realizada" },
  { id: "reservado", label: "Reservado" },
];

const card = "rounded-xl border border-black/5 bg-white p-5 shadow-sm";
const label = "mb-1 block text-xs font-semibold text-brand-black/70";
const input = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-black/40 focus:outline-none";

function numeroLindo(n: string | null) {
  if (!n) return "";
  const d = n.replace(/\D/g, "").replace(/^549?/, "");
  return d.length === 10 ? `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6)}` : n;
}

export default function AsistenteConfig({
  inicial,
  canales,
  logs,
  tokensMes,
}: {
  inicial: ConfigAsistente;
  canales: CanalAsistente[];
  logs: LogAsistente[];
  tokensMes: number;
}) {
  const [cfg, setCfg] = useState<ConfigAsistente>(inicial);
  const [aviso, setAviso] = useState<{ msg: string; ok: boolean } | null>(null);
  const [guardando, startGuardar] = useTransition();
  const [chat, setChat] = useState<{ rol: "cliente" | "asistente"; texto: string; acciones?: string[] }[]>([]);
  const [texto, setTexto] = useState("");
  const [pensando, startPensar] = useTransition();

  const set = <K extends keyof ConfigAsistente>(k: K, v: ConfigAsistente[K]) => setCfg((c) => ({ ...c, [k]: v }));
  const toggleLista = (k: "canales" | "seguimiento_estados", id: string) =>
    setCfg((c) => ({ ...c, [k]: c[k].includes(id) ? c[k].filter((x) => x !== id) : [...c[k], id] }));

  const guardar = () =>
    startGuardar(async () => {
      const r = await guardarConfigAsistenteAction(cfg);
      setAviso(r.ok ? { msg: "Guardado.", ok: true } : { msg: r.error, ok: false });
    });

  const probar = () => {
    const t = texto.trim();
    if (!t) return;
    const nuevo = [...chat, { rol: "cliente" as const, texto: t }];
    setChat(nuevo);
    setTexto("");
    startPensar(async () => {
      const r = await probarAsistenteAction(cfg, nuevo.map(({ rol, texto }) => ({ rol, texto })));
      setChat((c) => [...c, r.ok ? { rol: "asistente", texto: r.texto, acciones: r.acciones } : { rol: "asistente", texto: `⚠️ ${r.error}` }]);
    });
  };

  // Costo aproximado por millón de tokens (mezcla de entrada con caché y salida).
  const precioMillon = cfg.modelo.includes("haiku") ? 0.15 : cfg.modelo.includes("opus") ? 4 : 2.5;
  const costo = (tokensMes / 1_000_000) * precioMillon;

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_420px]">
      <div className="space-y-5">
        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-black">Estado</p>
              <p className="text-xs text-brand-black/60">El asistente solo atiende WhatsApp y los números que marques.</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={cfg.activo} onChange={(e) => set("activo", e.target.checked)} className="h-5 w-5 accent-[#25d366]" />
              {cfg.activo ? "Activado" : "Apagado"}
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["borrador", "Sugerir respuestas", "Escribe la respuesta y un asesor la envía con un clic. Recomendado para empezar."],
                ["automatico", "Responder solo", "Contesta al instante. Si un asesor respondió en las últimas 12 h, solo sugiere."],
              ] as const
            ).map(([id, titulo, desc]) => (
              <label key={id} className={`cursor-pointer rounded-lg border p-3 ${cfg.modo === id ? "border-brand-black bg-brand-cream" : "border-black/10"}`}>
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <input type="radio" name="modo" checked={cfg.modo === id} onChange={() => set("modo", id)} />
                  {titulo}
                </div>
                <p className="mt-1 text-xs text-brand-black/60">{desc}</p>
              </label>
            ))}
          </div>

          <p className={`${label} mt-4`}>Números que atiende</p>
          {canales.length === 0 && <p className="text-sm text-brand-black/60">Todavía no hay números de WhatsApp conectados.</p>}
          <div className="flex flex-wrap gap-2">
            {canales.map((c) => (
              <label
                key={c.id}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${cfg.canales.includes(c.id) ? "border-[#25d366] bg-[#e9f9ef]" : "border-black/10"}`}
              >
                <input type="checkbox" checked={cfg.canales.includes(c.id)} onChange={() => toggleLista("canales", c.id)} />
                {numeroLindo(c.numero) || c.nombre}
                {c.demo && <span className="rounded bg-amber-100 px-1.5 text-[10px] font-bold text-amber-800">PRUEBA</span>}
              </label>
            ))}
          </div>
        </section>

        <section className={card}>
          <p className="font-semibold text-brand-black">Personalidad y conocimiento</p>
          <p className="text-xs text-brand-black/60">
            Los productos, precios y disponibilidad los toma solo de Desarrollos, Lotes y Propiedades publicadas. Acá va lo que no está en el catálogo.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <span className={label}>Nombre del asistente</span>
              <input className={input} value={cfg.nombre_asistente} onChange={(e) => set("nombre_asistente", e.target.value)} />
            </div>
            <div>
              <span className={label}>Modelo de IA</span>
              <select className={input} value={cfg.modelo} onChange={(e) => set("modelo", e.target.value)}>
                {MODELOS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3">
            <span className={label}>Datos del negocio (honorarios, reservas, visitas, zona…)</span>
            <textarea className={`${input} h-48 font-mono text-xs`} value={cfg.info_negocio} onChange={(e) => set("info_negocio", e.target.value)} />
          </div>
          <div className="mt-3">
            <span className={label}>Instrucciones adicionales (opcional)</span>
            <textarea
              className={`${input} h-24 text-sm`}
              placeholder='Ej.: "Si preguntan por Las Perdices, ofrecé la visita del sábado." · "No ofrecer financiación en propiedades usadas."'
              value={cfg.instrucciones}
              onChange={(e) => set("instrucciones", e.target.value)}
            />
          </div>
        </section>

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-brand-black">Seguimientos</p>
              <p className="text-xs text-brand-black/60">Una vez por día escribe a quien dejó de responder (máximo según lo que elijas).</p>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={cfg.seguimiento_activo} onChange={(e) => set("seguimiento_activo", e.target.checked)} className="h-5 w-5" />
              {cfg.seguimiento_activo ? "Activados" : "Apagados"}
            </label>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <span className={label}>Horas sin respuesta</span>
              <input type="number" min={12} className={input} value={cfg.seguimiento_horas} onChange={(e) => set("seguimiento_horas", Number(e.target.value))} />
            </div>
            <div>
              <span className={label}>Máximo de seguimientos</span>
              <input type="number" min={1} max={5} className={input} value={cfg.seguimiento_max} onChange={(e) => set("seguimiento_max", Number(e.target.value))} />
            </div>
            <div>
              <span className={label}>Plantilla para después de 24 h</span>
              <input
                className={input}
                placeholder="nombre_de_la_plantilla"
                value={cfg.seguimiento_plantilla}
                onChange={(e) => set("seguimiento_plantilla", e.target.value)}
              />
            </div>
          </div>
          <p className={`${label} mt-3`}>Solo a clientes en estas etapas del CRM</p>
          <div className="flex flex-wrap gap-2">
            {ESTADOS.map((e) => (
              <label key={e.id} className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs ${cfg.seguimiento_estados.includes(e.id) ? "border-brand-black bg-brand-cream" : "border-black/10"}`}>
                <input type="checkbox" checked={cfg.seguimiento_estados.includes(e.id)} onChange={() => toggleLista("seguimiento_estados", e.id)} />
                {e.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-brand-black/50">
            Dentro de las 24 h desde el último mensaje del cliente escribe un mensaje propio; pasado ese plazo Meta solo permite plantillas aprobadas (la plantilla recibe el nombre del cliente en {"{{1}}"}).
          </p>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button onClick={guardar} disabled={guardando} className="flex items-center gap-2 rounded-lg bg-brand-black px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50">
            <Save className="h-4 w-4" />
            {guardando ? "Guardando…" : "Guardar"}
          </button>
          {aviso && <span className={`text-sm ${aviso.ok ? "text-green-700" : "text-red-600"}`}>{aviso.msg}</span>}
        </div>

        <section className={card}>
          <p className="font-semibold text-brand-black">Actividad reciente</p>
          <p className="text-xs text-brand-black/60">
            Uso de los últimos 30 días: {new Intl.NumberFormat("es-AR").format(tokensMes)} tokens (≈ USD {costo.toFixed(2)}).
          </p>
          {logs.length === 0 && <p className="mt-3 text-sm text-brand-black/50">Todavía no respondió ningún mensaje.</p>}
          <ul className="mt-3 divide-y divide-black/5">
            {logs.map((l) => (
              <li key={l.id} className="py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-brand-black/50">
                  <span>{new Date(l.creadoEn).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span className="rounded bg-brand-cream px-1.5 font-semibold text-brand-black/70">{l.tipo}</span>
                  <span>{l.contacto}</span>
                </div>
                {l.salida && <p className="mt-1 whitespace-pre-wrap text-brand-black/80">{l.salida}</p>}
                {l.acciones.length > 0 && <p className="mt-1 text-xs text-[#128c4a]">✓ {l.acciones.join(" · ")}</p>}
                {l.error && <p className="mt-1 text-xs text-red-600">{l.error}</p>}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className={`${card} flex h-fit flex-col xl:sticky xl:top-4`}>
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 font-semibold text-brand-black">
            <Bot className="h-4 w-4" /> Probar el asistente
          </p>
          <button onClick={() => setChat([])} className="flex items-center gap-1 text-xs text-brand-black/60" title="Empezar de nuevo">
            <RotateCcw className="h-3.5 w-3.5" /> Reiniciar
          </button>
        </div>
        <p className="text-xs text-brand-black/60">Escribí como si fueras un cliente. Usa la configuración de arriba (aunque no la hayas guardado). No envía nada ni agenda de verdad.</p>
        <div className="mt-3 flex h-[460px] flex-col gap-2 overflow-y-auto rounded-lg bg-[#efeae2] p-3">
          {chat.length === 0 && <p className="m-auto text-center text-xs text-brand-black/50">Ej.: “Hola, vi el aviso de los lotes en San Vicente, ¿cuánto salen?”</p>}
          {chat.map((m, i) => (
            <div key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.rol === "cliente" ? "self-end bg-[#d9fdd3]" : "self-start bg-white"}`}>
              <p className="whitespace-pre-wrap">{m.texto}</p>
              {m.acciones && m.acciones.length > 0 && <p className="mt-1 text-[11px] text-[#128c4a]">✓ {m.acciones.join(" · ")}</p>}
            </div>
          ))}
          {pensando && <div className="self-start rounded-lg bg-white px-3 py-2 text-sm text-brand-black/50 shadow-sm">escribiendo…</div>}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className={input}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !pensando && probar()}
            placeholder="Mensaje del cliente…"
          />
          <button onClick={probar} disabled={pensando || !texto.trim()} className="rounded-lg bg-[#25d366] px-3 text-white disabled:opacity-50" aria-label="Enviar">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </div>
  );
}
