"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, Download, Loader2, Mail, MessageCircle, Search, Trash2 } from "lucide-react";
import {
  DISPONIBILIDADES,
  ESTADOS_POSTULANTE,
  EXPERIENCIAS,
  GRUPOS_PUESTOS,
  PUESTOS,
  labelDe,
  type EstadoPostulante,
  type Postulante,
} from "@/lib/postulantes";
import { actualizarPostulanteAction, eliminarPostulanteAction, linkCvAction } from "@/lib/admin/postulantes-actions";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";

const COLOR_ESTADO: Record<EstadoPostulante, string> = {
  nuevo: "bg-sky-100 text-sky-800",
  contactado: "bg-amber-100 text-amber-800",
  entrevista: "bg-violet-100 text-violet-800",
  incorporado: "bg-emerald-100 text-emerald-800",
  descartado: "bg-black/5 text-black/50",
};

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "America/Argentina/Buenos_Aires" }).format(
    new Date(iso)
  );

export default function PostulantesManager({ postulantes, puedeEliminar }: { postulantes: Postulante[]; puedeEliminar: boolean }) {
  const router = useRouter();
  const [filtroEstado, setFiltroEstado] = useState<string>("activos");
  const [filtroPuesto, setFiltroPuesto] = useState<string>("");
  const [busqueda, setBusqueda] = useState("");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const p of postulantes) c[p.estado] = (c[p.estado] ?? 0) + 1;
    return c;
  }, [postulantes]);

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return postulantes.filter((p) => {
      if (filtroEstado === "activos" && (p.estado === "descartado" || p.estado === "incorporado")) return false;
      if (filtroEstado !== "activos" && filtroEstado !== "todos" && p.estado !== filtroEstado) return false;
      if (filtroPuesto && p.puesto !== filtroPuesto) return false;
      if (q && ![p.nombre, p.email, p.telefono, p.localidad ?? ""].some((v) => v.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [postulantes, filtroEstado, filtroPuesto, busqueda]);

  const correr = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No se pudo guardar.");
      else router.refresh();
    });

  const descargarCv = async (id: string) => {
    setError(null);
    const r = await linkCvAction(id);
    if (r.ok) window.open(r.url, "_blank", "noopener");
    else setError(r.error);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "activos", label: "En proceso" },
          ...ESTADOS_POSTULANTE,
          { value: "todos", label: "Todos" },
        ].map((e) => (
          <button
            key={e.value}
            onClick={() => setFiltroEstado(e.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
              filtroEstado === e.value ? "bg-brand-black text-white" : "bg-white text-brand-black/70 hover:bg-black/5"
            }`}
          >
            {e.label}
            {conteo[e.value] ? <span className="ml-1 opacity-60">({conteo[e.value]})</span> : null}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, mail, teléfono o localidad"
            className="h-10 w-full rounded-lg border border-black/10 bg-white pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={filtroPuesto}
          onChange={(e) => setFiltroPuesto(e.target.value)}
          className="h-10 rounded-lg border border-black/10 bg-white px-3 text-sm"
        >
          <option value="">Todos los puestos</option>
          {GRUPOS_PUESTOS.map((g) => (
            <optgroup key={g} label={g}>
              {PUESTOS.filter((p) => p.grupo === g).map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {lista.length === 0 ? (
        <p className="rounded-2xl bg-white p-8 text-center text-sm text-brand-black/55">No hay postulantes con estos filtros.</p>
      ) : (
        <ul className="space-y-3">
          {lista.map((p) => {
            const abiertoAca = abierto === p.id;
            return (
              <li key={p.id} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button onClick={() => setAbierto(abiertoAca ? null : p.id)} className="min-w-0 flex-1 text-left">
                    <p className="font-bold text-brand-black">
                      {p.nombre}
                      <span className={`ml-2 rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold ${COLOR_ESTADO[p.estado]}`}>
                        {labelDe(ESTADOS_POSTULANTE, p.estado)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-brand-black/65">
                      {labelDe(PUESTOS, p.puesto)} · {p.localidad} · {fecha(p.creadoEn)}
                    </p>
                  </button>
                  <div className="flex items-center gap-1.5">
                    <a
                      href={buildWhatsappClienteUrl(p.telefono, `Hola ${p.nombre.split(" ")[0]}, te escribo de De Nunzio Negocios Inmobiliarios por tu postulación.`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="WhatsApp"
                      className="rounded-lg bg-emerald-50 p-2 text-emerald-700 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </a>
                    <a href={`mailto:${p.email}`} title="Mail" className="rounded-lg bg-black/5 p-2 text-brand-black/70 hover:bg-black/10">
                      <Mail className="h-4 w-4" />
                    </a>
                    {p.cvPath && (
                      <button
                        onClick={() => descargarCv(p.id)}
                        title="Descargar CV"
                        className="flex items-center gap-1 rounded-lg bg-brand-green-700 px-2.5 py-2 text-xs font-bold text-white hover:bg-brand-green-600"
                      >
                        <Download className="h-4 w-4" /> CV
                      </button>
                    )}
                    <select
                      value={p.estado}
                      disabled={pendiente}
                      onChange={(e) => correr(() => actualizarPostulanteAction(p.id, { estado: e.target.value as EstadoPostulante }))}
                      className="h-9 rounded-lg border border-black/10 bg-white px-2 text-sm"
                      aria-label="Estado"
                    >
                      {ESTADOS_POSTULANTE.map((e) => (
                        <option key={e.value} value={e.value}>
                          {e.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {abiertoAca && (
                  <div className="mt-4 grid gap-4 border-t border-black/5 pt-4 text-sm md:grid-cols-2">
                    <dl className="space-y-1.5 text-brand-black/75">
                      <div><dt className="inline font-semibold">WhatsApp: </dt><dd className="inline">{p.telefono}</dd></div>
                      <div><dt className="inline font-semibold">Mail: </dt><dd className="inline">{p.email}</dd></div>
                      <div><dt className="inline font-semibold">Experiencia: </dt><dd className="inline">{labelDe(EXPERIENCIAS, p.experiencia)}</dd></div>
                      <div><dt className="inline font-semibold">Disponibilidad: </dt><dd className="inline">{labelDe(DISPONIBILIDADES, p.disponibilidad)}</dd></div>
                      <div className="flex items-center gap-1">
                        <Car className="h-4 w-4" />
                        <span>{p.movilidad ? "Tiene movilidad propia" : "Sin movilidad propia"}</span>
                      </div>
                      {p.matricula && (
                        <div><dt className="inline font-semibold">Matrícula: </dt><dd className="inline">{p.matricula}</dd></div>
                      )}
                      {p.linkedin && (
                        <div>
                          <dt className="inline font-semibold">Perfil: </dt>
                          <dd className="inline break-all">
                            {/^https?:\/\//.test(p.linkedin) ? (
                              <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="text-brand-green-700 underline">
                                {p.linkedin}
                              </a>
                            ) : (
                              p.linkedin
                            )}
                          </dd>
                        </div>
                      )}
                      {p.mensaje && <p className="whitespace-pre-line rounded-lg bg-brand-cream p-3 text-brand-black/80">{p.mensaje}</p>}
                    </dl>
                    <NotasPostulante
                      inicial={p.notas ?? ""}
                      guardando={pendiente}
                      onGuardar={(notas) => correr(() => actualizarPostulanteAction(p.id, { notas }))}
                      onEliminar={
                        puedeEliminar
                          ? () => {
                              if (confirm(`¿Eliminar la postulación de ${p.nombre}? También se borra su CV.`))
                                correr(() => eliminarPostulanteAction(p.id));
                            }
                          : undefined
                      }
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function NotasPostulante({
  inicial,
  guardando,
  onGuardar,
  onEliminar,
}: {
  inicial: string;
  guardando: boolean;
  onGuardar: (notas: string) => void;
  onEliminar?: () => void;
}) {
  const [notas, setNotas] = useState(inicial);
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-semibold uppercase tracking-wide text-brand-black/55">Notas internas</label>
      <textarea
        value={notas}
        onChange={(e) => setNotas(e.target.value)}
        rows={5}
        placeholder="Ej.: entrevista el jueves 10 hs, buena presencia, vive en San Vicente…"
        className="w-full rounded-lg border border-black/10 bg-white px-3 py-2"
      />
      <div className="flex items-center justify-between">
        {onEliminar ? (
          <button onClick={onEliminar} className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700">
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={() => onGuardar(notas)}
          disabled={guardando || notas === inicial}
          className="flex items-center gap-1.5 rounded-lg bg-brand-black px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {guardando && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Guardar notas
        </button>
      </div>
    </div>
  );
}
