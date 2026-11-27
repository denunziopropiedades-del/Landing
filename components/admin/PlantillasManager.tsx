"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { RefreshCw, Send } from "lucide-react";
import {
  crearPlantillaAction,
  enviarPlantillaAction,
  getPlantillas,
  type CuentaWa,
  type Plantilla,
} from "@/lib/admin/plantillas-actions";

const ESTADOS: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: "Aprobada", cls: "bg-green-100 text-green-800" },
  PENDING: { label: "En revisión", cls: "bg-amber-100 text-amber-800" },
  REJECTED: { label: "Rechazada", cls: "bg-red-100 text-red-700" },
  PAUSED: { label: "Pausada", cls: "bg-gray-200 text-gray-700" },
  DISABLED: { label: "Desactivada", cls: "bg-gray-200 text-gray-700" },
};
const CATEGORIAS: Record<string, string> = { MARKETING: "Marketing (promoción, seguimiento)", UTILITY: "Utilidad (turnos, pagos, avisos)" };

const contarVariables = (t: string) => new Set([...t.matchAll(/\{\{(\d+)\}\}/g)].map((m) => m[1])).size;

export default function PlantillasManager({ cuentas }: { cuentas: CuentaWa[] }) {
  const [wabaId, setWabaId] = useState(cuentas[0]?.id ?? "");
  const [plantillas, setPlantillas] = useState<Plantilla[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, startCarga] = useTransition();

  const [nueva, setNueva] = useState({
    nombre: "",
    categoria: "MARKETING" as "MARKETING" | "UTILITY",
    idioma: "es_AR",
    cuerpo: "Hola {{1}}, ¿cómo estás? Te escribo por los lotes de {{2}} que consultaste. ¿Te gustaría coordinar una visita sin compromiso esta semana?",
    pie: "MATULOTES · matulotes.app",
    ejemplos: ["Laura", "Las Perdices"],
  });
  const [msgCrear, setMsgCrear] = useState<{ t: string; ok: boolean } | null>(null);
  const [creando, startCrear] = useTransition();

  const cuenta = cuentas.find((c) => c.id === wabaId);
  const aprobadas = plantillas.filter((p) => p.estado === "APPROVED");
  const [envio, setEnvio] = useState({ phoneNumberId: "", para: "", plantilla: "", variables: [] as string[] });
  const [msgEnvio, setMsgEnvio] = useState<{ t: string; ok: boolean } | null>(null);
  const [enviando, startEnvio] = useTransition();

  const cargar = () =>
    startCarga(async () => {
      if (!wabaId) return;
      const r = await getPlantillas(wabaId);
      setPlantillas(r.plantillas);
      setError(r.error);
    });

  useEffect(() => {
    cargar();
    setEnvio((e) => ({ ...e, phoneNumberId: cuenta?.numeros[0]?.id ?? "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wabaId]);

  const nVars = contarVariables(nueva.cuerpo);
  const plantillaEnvio = useMemo(() => plantillas.find((p) => p.nombre === envio.plantilla), [plantillas, envio.plantilla]);

  const crear = () =>
    startCrear(async () => {
      setMsgCrear(null);
      const r = await crearPlantillaAction({ wabaId, ...nueva, ejemplos: nueva.ejemplos.slice(0, nVars) });
      if (!r.ok) return setMsgCrear({ t: r.error, ok: false });
      setMsgCrear({ t: `Plantilla creada y enviada a Meta para aprobación (estado: ${ESTADOS[r.estado]?.label ?? r.estado}).`, ok: true });
      cargar();
    });

  const enviar = () =>
    startEnvio(async () => {
      setMsgEnvio(null);
      const p = plantillaEnvio;
      const num = cuenta?.numeros.find((n) => n.id === envio.phoneNumberId);
      if (!p || !num) return setMsgEnvio({ t: "Elegí el número y la plantilla.", ok: false });
      const r = await enviarPlantillaAction({
        phoneNumberId: num.id,
        numeroEmisor: num.numero,
        para: envio.para,
        plantilla: p.nombre,
        idioma: p.idioma,
        cuerpo: p.cuerpo,
        variables: envio.variables.slice(0, p.variables),
      });
      setMsgEnvio(r.ok ? { t: "Mensaje enviado. Ya aparece en Mensajes.", ok: true } : { t: r.error, ok: false });
    });

  const input = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm outline-none focus:border-brand-green-500";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-semibold text-brand-black">Cuenta de WhatsApp</label>
        <select value={wabaId} onChange={(e) => setWabaId(e.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm">
          {cuentas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.numeros.map((n) => n.numero).join(", ") || "sin números"})
            </option>
          ))}
        </select>
        <button onClick={cargar} className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold">
          <RefreshCw className={`h-4 w-4 ${cargando ? "animate-spin" : ""}`} /> Actualizar
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="grid gap-6 xl:grid-cols-2">
        {/* Crear */}
        <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-brand-black">Nueva plantilla</h2>
          <p className="mb-4 text-xs text-brand-black/60">
            Meta revisa cada plantilla antes de que se pueda usar (suele tardar minutos). Usá {"{{1}}"}, {"{{2}}"}… para los datos que cambian, como el
            nombre o el desarrollo.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-brand-black/70">Nombre interno</label>
              <input value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} placeholder="seguimiento_visita" className={input} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-brand-black/70">Categoría</label>
                <select
                  value={nueva.categoria}
                  onChange={(e) => setNueva({ ...nueva, categoria: e.target.value as "MARKETING" | "UTILITY" })}
                  className={input}
                >
                  {Object.entries(CATEGORIAS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-black/70">Idioma</label>
                <select value={nueva.idioma} onChange={(e) => setNueva({ ...nueva, idioma: e.target.value })} className={input}>
                  <option value="es_AR">Español (Argentina)</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-black/70">Mensaje</label>
              <textarea value={nueva.cuerpo} onChange={(e) => setNueva({ ...nueva, cuerpo: e.target.value })} rows={5} className={input} />
            </div>
            {nVars > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {Array.from({ length: nVars }).map((_, i) => (
                  <div key={i}>
                    <label className="text-xs font-semibold text-brand-black/70">Ejemplo para {`{{${i + 1}}}`}</label>
                    <input
                      value={nueva.ejemplos[i] ?? ""}
                      onChange={(e) => {
                        const ej = [...nueva.ejemplos];
                        ej[i] = e.target.value;
                        setNueva({ ...nueva, ejemplos: ej });
                      }}
                      className={input}
                    />
                  </div>
                ))}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold text-brand-black/70">Pie (opcional)</label>
              <input value={nueva.pie} onChange={(e) => setNueva({ ...nueva, pie: e.target.value })} maxLength={60} className={input} />
            </div>
            <button
              onClick={crear}
              disabled={creando || !wabaId}
              className="rounded-lg bg-brand-black px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {creando ? "Creando…" : "Crear y enviar a aprobación"}
            </button>
            {msgCrear && <p className={`rounded-lg px-3 py-2 text-sm ${msgCrear.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msgCrear.t}</p>}
          </div>
        </div>

        {/* Enviar */}
        <div className="rounded-xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold text-brand-black">Enviar una plantilla</h2>
          <p className="mb-4 text-xs text-brand-black/60">
            Para escribirle a alguien por primera vez o cuando pasaron más de 24 h desde su último mensaje. La conversación queda en Mensajes.
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-brand-black/70">Desde el número</label>
                <select value={envio.phoneNumberId} onChange={(e) => setEnvio({ ...envio, phoneNumberId: e.target.value })} className={input}>
                  {cuenta?.numeros.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.numero} {n.nombre ? `· ${n.nombre}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-brand-black/70">Para (WhatsApp)</label>
                <input value={envio.para} onChange={(e) => setEnvio({ ...envio, para: e.target.value })} placeholder="11 5555 0142" className={input} />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-black/70">Plantilla aprobada</label>
              <select
                value={envio.plantilla}
                onChange={(e) => setEnvio({ ...envio, plantilla: e.target.value, variables: [] })}
                className={input}
              >
                <option value="">Elegí una plantilla…</option>
                {aprobadas.map((p) => (
                  <option key={p.id} value={p.nombre}>
                    {p.nombre} ({p.idioma})
                  </option>
                ))}
              </select>
            </div>
            {plantillaEnvio && (
              <>
                <p className="whitespace-pre-wrap rounded-lg bg-[#dcf5c8] px-3 py-2 text-sm">
                  {envio.variables.reduce((t, v, i) => (v ? t.split(`{{${i + 1}}}`).join(v) : t), plantillaEnvio.cuerpo)}
                </p>
                {Array.from({ length: plantillaEnvio.variables }).map((_, i) => (
                  <input
                    key={i}
                    value={envio.variables[i] ?? ""}
                    onChange={(e) => {
                      const v = [...envio.variables];
                      v[i] = e.target.value;
                      setEnvio({ ...envio, variables: v });
                    }}
                    placeholder={`Valor para {{${i + 1}}}`}
                    className={input}
                  />
                ))}
              </>
            )}
            <button
              onClick={enviar}
              disabled={enviando || !envio.plantilla || !envio.para}
              className="flex items-center gap-2 rounded-lg bg-[#25d366] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {enviando ? "Enviando…" : "Enviar por WhatsApp"}
            </button>
            {msgEnvio && <p className={`rounded-lg px-3 py-2 text-sm ${msgEnvio.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{msgEnvio.t}</p>}
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="rounded-xl border border-black/5 bg-white shadow-sm">
        <div className="border-b border-black/5 px-5 py-3 font-semibold text-brand-black">Plantillas de la cuenta ({plantillas.length})</div>
        {plantillas.length === 0 ? (
          <p className="p-5 text-sm text-brand-black/50">{cargando ? "Cargando…" : "Todavía no hay plantillas."}</p>
        ) : (
          <ul className="divide-y divide-black/5">
            {plantillas.map((p) => (
              <li key={p.id} className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-start sm:gap-4">
                <div className="sm:w-56">
                  <b className="text-sm text-brand-black">{p.nombre}</b>
                  <p className="text-xs text-brand-black/50">
                    {p.categoria === "MARKETING" ? "Marketing" : p.categoria === "UTILITY" ? "Utilidad" : p.categoria} · {p.idioma}
                  </p>
                  <span className={`mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${ESTADOS[p.estado]?.cls ?? "bg-gray-100"}`}>
                    {ESTADOS[p.estado]?.label ?? p.estado}
                  </span>
                  {p.motivoRechazo && <p className="text-[11px] text-red-600">Motivo: {p.motivoRechazo}</p>}
                </div>
                <p className="flex-1 whitespace-pre-wrap text-sm text-brand-black/80">
                  {p.cuerpo}
                  {p.pie && <span className="block text-xs text-brand-black/50">{p.pie}</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
