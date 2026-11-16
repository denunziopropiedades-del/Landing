"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Home, House, Loader2, MapPinned, MessageCircle, Wheat } from "lucide-react";
import { ZONAS } from "@/lib/zonas";
import {
  ACCESOS,
  ANTIGUEDADES,
  APTITUDES,
  ENTORNOS,
  ESCRITURAS,
  ESTADOS_CONSERVACION,
  EXTRAS,
  TIPOS_TASADOR,
  faltanteTasador,
  grupoDe,
  usd,
  type TipoTasador,
} from "@/lib/tasador";
import { buildWhatsappUrl } from "@/lib/whatsapp";

const ICONOS: Record<TipoTasador, typeof Home> = {
  lote: MapPinned,
  casa: Home,
  quinta: House,
  departamento: Building2,
  ph: Building2,
  campo: Wheat,
};

type Resultado = { inmueble: string; minimo: number; central: number; maximo: number; unitario: number; unidad: string };

const input = "mt-1 w-full rounded-xl border border-black/15 bg-white px-3 py-2.5 text-base text-brand-black outline-none focus:border-brand-green-700";
const etiqueta = "block text-sm font-semibold text-brand-black";

/** Botones de opción única (un clic). */
function Opciones({
  titulo,
  opciones,
  valor,
  onChange,
}: {
  titulo: string;
  opciones: readonly { value: string; label: string }[];
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className={etiqueta}>{titulo}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {opciones.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
              valor === o.value ? "border-brand-green-700 bg-brand-green-700 text-white" : "border-black/15 bg-white text-brand-black/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Numero({ titulo, valor, onChange, sufijo }: { titulo: string; valor: string; onChange: (v: string) => void; sufijo: string }) {
  return (
    <label className={etiqueta}>
      {titulo}
      <span className="relative mt-1 block">
        <input
          value={valor}
          onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, "").slice(0, 10))}
          inputMode="decimal"
          placeholder="0"
          className={`${input} mt-0 pr-12`}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-brand-black/50">{sufijo}</span>
      </span>
    </label>
  );
}

const aNumero = (v: string) => {
  const n = Number(v.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

export default function TasadorOnline() {
  const [paso, setPaso] = useState(1);
  const [tipo, setTipo] = useState<TipoTasador | null>(null);
  const [partido, setPartido] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [direccion, setDireccion] = useState("");
  const [supTerreno, setSupTerreno] = useState("");
  const [supCubierta, setSupCubierta] = useState("");
  const [supDescubierta, setSupDescubierta] = useState("");
  const [entorno, setEntorno] = useState("consolidado");
  const [escritura, setEscritura] = useState("escritura");
  const [estado, setEstado] = useState("muy-bueno");
  const [antiguedad, setAntiguedad] = useState("hasta-10");
  const [aptitud, setAptitud] = useState("mixto");
  const [acceso, setAcceso] = useState("consolidado");
  const [extras, setExtras] = useState<string[]>([]);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  const grupo = tipo ? grupoDe(tipo) : "lote";

  const caracteristicas = () => ({
    tipo: tipo ?? ("lote" as TipoTasador),
    partido,
    localidad: localidad.trim() || undefined,
    direccion: direccion.trim() || undefined,
    supTerreno: aNumero(supTerreno),
    supCubierta: grupo === "casa" || grupo === "depto" ? aNumero(supCubierta) : undefined,
    supDescubierta: grupo === "casa" || grupo === "depto" ? aNumero(supDescubierta) : undefined,
    entorno: grupo === "lote" || grupo === "casa" ? (entorno as "consolidado") : undefined,
    escritura: escritura as "escritura",
    estado: grupo === "casa" || grupo === "depto" ? (estado as "bueno") : undefined,
    antiguedad: grupo === "casa" || grupo === "depto" ? (antiguedad as "hasta-10") : undefined,
    aptitud: grupo === "campo" ? (aptitud as "mixto") : undefined,
    acceso: grupo === "campo" ? (acceso as "tierra") : undefined,
    extras,
  });

  const elegirTipo = (t: TipoTasador) => {
    setTipo(t);
    setExtras([]);
    setError(null);
    setPaso(2);
  };

  const siguiente = () => {
    setError(null);
    if (paso === 2 && !partido) return setError("Elegí el partido donde está la propiedad.");
    if (paso === 3) {
      const falta = faltanteTasador(caracteristicas());
      if (falta) return setError(falta);
    }
    setPaso(paso + 1);
  };

  const enviar = async () => {
    setError(null);
    if (nombre.trim().length < 2) return setError("Ingresá tu nombre.");
    if (telefono.replace(/\D/g, "").length < 8) return setError("Ingresá tu WhatsApp con código de área.");
    setEnviando(true);
    try {
      const r = await fetch("/api/tasador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...caracteristicas(), nombre, telefono, email: email.trim() || undefined, empresa }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "No pudimos calcular la tasación. Probá de nuevo.");
      if (typeof j.central === "number") setResultado(j as Resultado);
      setPaso(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos calcular la tasación. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  const alternarExtra = (v: string) => setExtras((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));

  if (paso === 5) {
    return (
      <div className="space-y-5">
        {resultado ? (
          <>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-green-700">Valor estimado de venta</p>
              <p className="mt-1 text-sm text-brand-black/65">{resultado.inmueble}</p>
            </div>
            <div className="rounded-2xl bg-brand-black p-5 text-center text-white">
              <p className="text-xs uppercase tracking-wide text-white/60">Valor central</p>
              <p className="font-display text-4xl font-bold text-brand-gold-400">{usd(resultado.central)}</p>
              {resultado.unitario > 0 && (
                <p className="mt-1 text-xs text-white/60">
                  {usd(resultado.unitario)} por {resultado.unidad}
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-3 text-left">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[11px] uppercase text-white/60">Mínimo</p>
                  <p className="text-lg font-bold">{usd(resultado.minimo)}</p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[11px] uppercase text-white/60">Máximo</p>
                  <p className="text-lg font-bold">{usd(resultado.maximo)}</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-brand-black/70">
              Es una estimación orientativa calculada con valores de referencia de la zona, sin inspección de la propiedad. Te contactamos
              dentro de las 24 horas para enviarte el <b>informe comparativo</b> firmado por Martillero Público, sin cargo.
            </p>
          </>
        ) : (
          <p className="text-brand-black/80">Recibimos tu pedido. Te contactamos dentro de las 24 horas con la tasación.</p>
        )}
        <a
          href={buildWhatsappUrl(`Hola, usé el tasador online${resultado ? ` para ${resultado.inmueble}` : ""} y quiero el informe comparativo.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3 font-semibold text-white"
        >
          <MessageCircle className="h-5 w-5" /> Pedir el informe por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((n) => (
          <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= paso ? "bg-brand-green-700" : "bg-black/10"}`} />
        ))}
      </div>

      {paso === 1 && (
        <div>
          <p className="font-display text-xl font-bold text-brand-black">¿Qué querés tasar?</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {TIPOS_TASADOR.map((t) => {
              const Icono = ICONOS[t.value];
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => elegirTipo(t.value)}
                  className={`flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition hover:border-brand-green-700 ${
                    tipo === t.value ? "border-brand-green-700 bg-brand-green-700/5" : "border-black/10 bg-white"
                  }`}
                >
                  <Icono className="h-6 w-6 text-brand-green-700" />
                  <span className="font-bold text-brand-black">{t.label}</span>
                  <span className="text-xs text-brand-black/60">{t.ayuda}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {paso === 2 && (
        <div className="space-y-4">
          <p className="font-display text-xl font-bold text-brand-black">¿Dónde está?</p>
          <label className={etiqueta}>
            Partido
            <select value={partido} onChange={(e) => setPartido(e.target.value)} className={input}>
              <option value="">Elegí el partido</option>
              {ZONAS.map((z) => (
                <optgroup key={z.slug} label={z.nombre}>
                  {z.partidos.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className={etiqueta}>
            Localidad o barrio
            <input value={localidad} onChange={(e) => setLocalidad(e.target.value)} maxLength={120} placeholder="Ej.: Guernica, barrio Las Perdices" className={input} />
          </label>
          <label className={etiqueta}>
            Dirección <span className="font-normal text-brand-black/50">(opcional)</span>
            <input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={200} placeholder="Calle y número, o ruta y km" className={input} />
          </label>
        </div>
      )}

      {paso === 3 && (
        <div className="space-y-5">
          <p className="font-display text-xl font-bold text-brand-black">Contanos cómo es</p>

          {grupo === "campo" ? (
            <Numero titulo="Superficie" valor={supTerreno} onChange={setSupTerreno} sufijo="ha" />
          ) : grupo === "depto" ? (
            <div className="grid grid-cols-2 gap-3">
              <Numero titulo="Superficie cubierta" valor={supCubierta} onChange={setSupCubierta} sufijo="m²" />
              <Numero titulo="Balcón o patio" valor={supDescubierta} onChange={setSupDescubierta} sufijo="m²" />
            </div>
          ) : grupo === "casa" ? (
            <div className="grid grid-cols-2 gap-3">
              <Numero titulo="Terreno" valor={supTerreno} onChange={setSupTerreno} sufijo="m²" />
              <Numero titulo="Cubiertos" valor={supCubierta} onChange={setSupCubierta} sufijo="m²" />
              <Numero titulo="Galería o quincho" valor={supDescubierta} onChange={setSupDescubierta} sufijo="m²" />
            </div>
          ) : (
            <Numero titulo="Superficie del lote" valor={supTerreno} onChange={setSupTerreno} sufijo="m²" />
          )}

          {(grupo === "lote" || grupo === "casa") && <Opciones titulo="Ubicación" opciones={ENTORNOS} valor={entorno} onChange={setEntorno} />}
          {(grupo === "casa" || grupo === "depto") && (
            <>
              <Opciones titulo="Estado" opciones={ESTADOS_CONSERVACION} valor={estado} onChange={setEstado} />
              <Opciones titulo="Antigüedad" opciones={ANTIGUEDADES} valor={antiguedad} onChange={setAntiguedad} />
            </>
          )}
          {grupo === "campo" && (
            <>
              <Opciones titulo="Aptitud" opciones={APTITUDES} valor={aptitud} onChange={setAptitud} />
              <Opciones titulo="Acceso" opciones={ACCESOS} valor={acceso} onChange={setAcceso} />
            </>
          )}

          <div>
            <p className={etiqueta}>{grupo === "lote" ? "Servicios y extras" : "Extras"}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {EXTRAS[grupo].map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => alternarExtra(e.value)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                    extras.includes(e.value) ? "border-brand-green-700 bg-brand-green-700 text-white" : "border-black/15 bg-white text-brand-black/80"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <Opciones titulo="Documentación" opciones={ESCRITURAS} valor={escritura} onChange={setEscritura} />
        </div>
      )}

      {paso === 4 && (
        <div className="space-y-4">
          <div>
            <p className="font-display text-xl font-bold text-brand-black">¿A quién le mostramos el resultado?</p>
            <p className="mt-1 text-sm text-brand-black/65">Dejanos tus datos y ves el valor estimado al instante.</p>
          </div>
          <label className={etiqueta}>
            Nombre y apellido
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={120} autoComplete="name" className={input} />
          </label>
          <label className={etiqueta}>
            WhatsApp
            <input value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={40} inputMode="tel" autoComplete="tel" placeholder="11 1234-5678" className={input} />
          </label>
          <label className={etiqueta}>
            Email <span className="font-normal text-brand-black/50">(opcional, para enviarte el informe)</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} maxLength={200} inputMode="email" autoComplete="email" className={input} />
          </label>
          <input value={empresa} onChange={(e) => setEmpresa(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

      {paso > 1 && (
        <div className="flex gap-3">
          <button type="button" onClick={() => { setError(null); setPaso(paso - 1); }} className="flex items-center gap-1 rounded-full border border-black/15 px-4 py-3 text-sm font-semibold text-brand-black/70">
            <ArrowLeft className="h-4 w-4" /> Atrás
          </button>
          {paso < 4 ? (
            <button type="button" onClick={siguiente} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-green-700 px-6 py-3 font-semibold text-white">
              Siguiente <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={enviar} disabled={enviando} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-gold-400 px-6 py-3 font-bold text-brand-black disabled:opacity-60">
              {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {enviando ? "Calculando…" : "Ver el valor estimado"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
