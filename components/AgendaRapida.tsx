"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, Loader2, MapPin } from "lucide-react";
import { HORARIOS_VISITA } from "@/lib/agenda";

export type OpcionVisita = {
  /** Identificador único en la lista ("proyecto:<id>" o "propiedad:<id>"). */
  clave: string;
  tipo: "proyecto" | "propiedad";
  id: string;
  grupo: "barrios" | "casas" | "campos" | "terrenos" | "comerciales";
  nombre: string;
  ubicacion: string;
};

const GRUPOS: { value: OpcionVisita["grupo"]; label: string }[] = [
  { value: "barrios", label: "Barrios y lotes" },
  { value: "casas", label: "Casas y deptos" },
  { value: "campos", label: "Campos" },
  { value: "terrenos", label: "Terrenos" },
  { value: "comerciales", label: "Locales y galpones" },
];

const TZ = "America/Argentina/Buenos_Aires";
const DIAS_A_MOSTRAR = 14;
/** No se ofrecen turnos de hoy que empiecen dentro de la próxima hora. */
const ANTICIPACION_MINIMA_MINUTOS = 60;

function ahoraBuenosAires() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const v = (t: string) => partes.find((p) => p.type === t)?.value ?? "00";
  return { fecha: `${v("year")}-${v("month")}-${v("day")}`, minutos: Number(v("hour")) * 60 + Number(v("minute")) };
}

function proximosDias(desde: string) {
  const [a, m, d] = desde.split("-").map(Number);
  return Array.from({ length: DIAS_A_MOSTRAR }, (_, i) => {
    const f = new Date(Date.UTC(a, m - 1, d + i));
    const iso = f.toISOString().slice(0, 10);
    const semana = f.toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" }).replace(".", "");
    return {
      iso,
      etiqueta: i === 0 ? "Hoy" : i === 1 ? "Mañana" : semana.charAt(0).toUpperCase() + semana.slice(1),
      numero: f.getUTCDate(),
      mes: f.toLocaleDateString("es-AR", { month: "short", timeZone: "UTC" }).replace(".", ""),
      largo: f.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    };
  });
}

const aMin = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5));

export default function AgendaRapida({
  opciones,
  opcionInicial,
  whatsappNumero,
  propiedad,
}: {
  opciones: OpcionVisita[];
  opcionInicial?: string;
  whatsappNumero: string;
  /** Si viene desde la ficha de una propiedad: la visita es a esa propiedad (no se elige barrio). */
  propiedad?: { id: string; titulo: string; ubicacion: string };
}) {
  const ahora = useMemo(ahoraBuenosAires, []);
  const dias = useMemo(() => proximosDias(ahora.fecha), [ahora.fecha]);

  const [clave, setClave] = useState(opcionInicial ?? opciones[0]?.clave ?? "");
  const gruposConOpciones = GRUPOS.filter((g) => opciones.some((o) => o.grupo === g.value));
  const [grupo, setGrupo] = useState<OpcionVisita["grupo"]>(
    opciones.find((o) => o.clave === (opcionInicial ?? opciones[0]?.clave))?.grupo ?? gruposConOpciones[0]?.value ?? "barrios"
  );
  const [fecha, setFecha] = useState("");
  const [horario, setHorario] = useState("");
  const [ocupados, setOcupados] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [reprogramarUrl, setReprogramarUrl] = useState<string | null>(null);

  useEffect(() => {
    setHorario("");
    if (!fecha) return;
    let cancelado = false;
    setCargando(true);
    fetch(`/api/visitas/disponibilidad?fecha=${fecha}`)
      .then((r) => r.json())
      .then((d) => !cancelado && setOcupados(Array.isArray(d.ocupados) ? d.ocupados : []))
      .catch(() => !cancelado && setOcupados([]))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [fecha]);

  const libres = HORARIOS_VISITA.filter(
    (h) => !ocupados.includes(h) && (fecha !== ahora.fecha || aMin(h) >= ahora.minutos + ANTICIPACION_MINIMA_MINUTOS)
  );
  const manana = libres.filter((h) => aMin(h) < 13 * 60);
  const tarde = libres.filter((h) => aMin(h) >= 13 * 60);

  const proyectoElegido = opciones.find((o) => o.clave === clave);
  const proyecto = propiedad ? { nombre: propiedad.titulo, ubicacion: propiedad.ubicacion } : proyectoElegido;
  const dia = dias.find((d) => d.iso === fecha);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const datosOk = nombre.trim().length >= 2 && telefono.replace(/\D/g, "").length >= 8 && emailOk;
  const listo = Boolean(fecha && horario && datosOk);

  const confirmar = async () => {
    if (!listo) return;
    setEstado("enviando");
    setError(null);
    try {
      const res = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proyectoId: propiedad || proyectoElegido?.tipo !== "proyecto" ? undefined : proyectoElegido.id,
          propiedadId: propiedad?.id ?? (proyectoElegido?.tipo === "propiedad" ? proyectoElegido.id : undefined),
          nombre,
          telefono,
          email,
          fecha,
          horario,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(typeof body?.error === "string" ? body.error : "No se pudo agendar. Probá de nuevo.");
        setEstado("error");
        if (res.status === 409) {
          // Alguien tomó el turno: refresca la disponibilidad del día.
          const d = await fetch(`/api/visitas/disponibilidad?fecha=${fecha}`).then((r) => r.json()).catch(() => null);
          setOcupados(Array.isArray(d?.ocupados) ? d.ocupados : ocupados);
          setHorario("");
        }
        return;
      }
      setReprogramarUrl(body?.reprogramarUrl ?? null);
      setEstado("ok");
    } catch {
      setError("No se pudo agendar. Revisá tu conexión y probá de nuevo.");
      setEstado("error");
    }
  };

  if (estado === "ok" && dia) {
    const texto = encodeURIComponent(
      `Hola! Agendé una visita${proyecto ? ` a ${proyecto.nombre}` : ""} para el ${dia.largo} a las ${horario} hs. Soy ${nombre.trim()}.`
    );
    return (
      <div className="rounded-3xl bg-white p-7 text-center shadow-sm">
        <CalendarCheck className="mx-auto h-14 w-14 text-brand-green-600" />
        <p className="mt-3 font-display text-2xl font-bold text-brand-black">¡Visita agendada!</p>
        <p className="mt-2 text-brand-black/75">
          Te esperamos el <b>{dia.largo}</b> a las <b>{horario} hs</b>
          {proyecto ? (
            <>
              {" "}
              en <b>{proyecto.nombre}</b>
            </>
          ) : null}
          . Al llegar, preguntá por Matías De Nunzio.
        </p>
        <a
          href={`/api/whatsapp?text=${texto}`}
          target="_blank"
          rel="noopener"
          className="mt-6 flex min-h-[52px] items-center justify-center rounded-full bg-[#25D366] px-6 font-bold text-white"
        >
          Avisar por WhatsApp
        </a>
        {reprogramarUrl && (
          <a href={reprogramarUrl} className="mt-3 block text-sm font-semibold text-brand-green-700 underline">
            ¿Te surgió algo? Cambiar día u horario
          </a>
        )}
      </div>
    );
  }

  const chip = (activo: boolean) =>
    `rounded-2xl border-2 transition active:scale-[0.97] ${
      activo
        ? "border-brand-green-600 bg-brand-green-600 text-white"
        : "border-black/10 bg-white text-brand-black hover:border-brand-green-600"
    }`;

  return (
    <div className="space-y-7">
      {propiedad && (
        <div className="flex items-start gap-3 rounded-2xl border-2 border-brand-green-600 bg-white p-4">
          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-green-700" />
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-black/50">Vas a visitar</p>
            <p className="font-bold leading-snug text-brand-black">{propiedad.titulo}</p>
            <p className="text-sm text-brand-black/60">{propiedad.ubicacion}</p>
          </div>
        </div>
      )}

      {!propiedad && opciones.length > 1 && (
        <Paso numero={1} titulo="¿Qué querés visitar?">
          {gruposConOpciones.length > 1 && (
            <div className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">
              {gruposConOpciones.map((g) => {
                const cantidad = opciones.filter((o) => o.grupo === g.value).length;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGrupo(g.value)}
                    className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-semibold transition ${
                      grupo === g.value
                        ? "border-brand-black bg-brand-black text-white"
                        : "border-black/10 bg-white text-brand-black"
                    }`}
                  >
                    {g.label} <span className="opacity-60">({cantidad})</span>
                  </button>
                );
              })}
            </div>
          )}
          <div className="grid gap-2">
            {opciones
              .filter((o) => gruposConOpciones.length <= 1 || o.grupo === grupo)
              .map((p) => (
                <button
                  key={p.clave}
                  type="button"
                  onClick={() => setClave(p.clave)}
                  className={`${chip(clave === p.clave)} flex items-center gap-3 px-4 py-3 text-left`}
                >
                  <MapPin className="h-5 w-5 shrink-0" />
                  <span>
                    <span className="block font-bold">{p.nombre}</span>
                    <span className={`text-xs ${clave === p.clave ? "text-white/80" : "text-brand-black/60"}`}>{p.ubicacion}</span>
                  </span>
                </button>
              ))}
          </div>
        </Paso>
      )}

      <Paso numero={opciones.length > 1 ? 2 : 1} titulo="Elegí el día">
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
          {dias.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => setFecha(d.iso)}
              className={`${chip(fecha === d.iso)} flex w-[68px] shrink-0 snap-start flex-col items-center py-2.5`}
            >
              <span className="text-xs font-semibold">{d.etiqueta}</span>
              <span className="text-2xl font-extrabold leading-tight">{d.numero}</span>
              <span className={`text-[11px] ${fecha === d.iso ? "text-white/80" : "text-brand-black/50"}`}>{d.mes}</span>
            </button>
          ))}
        </div>
      </Paso>

      {fecha && (
        <Paso numero={opciones.length > 1 ? 3 : 2} titulo="Elegí el horario">
          {cargando ? (
            <p className="flex items-center gap-2 text-sm text-brand-black/60">
              <Loader2 className="h-4 w-4 animate-spin" /> Buscando horarios libres…
            </p>
          ) : libres.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-brand-black/70">
              No quedan horarios libres ese día. Probá con otro día.
            </p>
          ) : (
            <div className="space-y-3">
              {[
                ["Mañana", manana],
                ["Tarde", tarde],
              ].map(([titulo, lista]) =>
                (lista as string[]).length > 0 ? (
                  <div key={titulo as string}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-brand-black/50">{titulo as string}</p>
                    <div className="grid grid-cols-4 gap-2">
                      {(lista as string[]).map((h) => (
                        <button
                          key={h}
                          type="button"
                          onClick={() => setHorario(h)}
                          className={`${chip(horario === h)} py-3 text-sm font-bold`}
                        >
                          {h}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          )}
        </Paso>
      )}

      {horario && (
        <Paso numero={opciones.length > 1 ? 4 : 3} titulo="Tus datos">
          <div className="space-y-3">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre y apellido"
              autoComplete="name"
              className="h-[52px] w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base focus:border-brand-green-600 focus:outline-none"
            />
            <input
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="WhatsApp (ej: 11 2345 6789)"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="h-[52px] w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base focus:border-brand-green-600 focus:outline-none"
            />
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Mail (te mandamos la confirmación)"
              type="email"
              inputMode="email"
              autoComplete="email"
              className="h-[52px] w-full rounded-2xl border-2 border-black/10 bg-white px-4 text-base focus:border-brand-green-600 focus:outline-none"
            />
            {email.trim().length > 3 && !emailOk && <p className="px-1 text-xs text-red-600">Revisá el mail, parece incompleto.</p>}
          </div>
        </Paso>
      )}

      {estado === "error" && error && <p className="rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      {horario && (
        <div className="sticky bottom-3 z-10">
          <button
            type="button"
            onClick={confirmar}
            disabled={!listo || estado === "enviando"}
            className="flex min-h-[58px] w-full items-center justify-center gap-2 rounded-full bg-brand-green-700 px-6 text-base font-bold text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] transition hover:bg-brand-green-600 disabled:bg-brand-black/30 disabled:shadow-none"
          >
            {estado === "enviando" && <Loader2 className="h-5 w-5 animate-spin" />}
            {listo && dia ? `Confirmar visita · ${dia.etiqueta} ${horario} hs` : "Completá nombre, WhatsApp y mail"}
          </button>
        </div>
      )}
    </div>
  );
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2.5 text-lg font-bold text-brand-black">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green-700 text-sm text-white">{numero}</span>
        {titulo}
      </h2>
      {children}
    </section>
  );
}
