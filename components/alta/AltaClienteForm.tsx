"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";

const input =
  "w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-base text-brand-black focus:border-brand-green-600 focus:outline-none";
const label = "mb-1 block text-sm font-medium text-brand-black/70";

const ESTADOS_CIVILES = ["Soltero/a", "Casado/a", "Divorciado/a", "Viudo/a", "Unión convivencial"];

export default function AltaClienteForm() {
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [listo, setListo] = useState(false);
  const [estadoCivil, setEstadoCivil] = useState("");
  const [nupcias, setNupcias] = useState("primeras");

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const fd = new FormData(e.currentTarget);
    const datos = Object.fromEntries(fd.entries()) as Record<string, string>;
    if (estadoCivil === "Casado/a") datos.estadoCivil = `Casado/a en ${nupcias} nupcias`;
    setEnviando(true);
    try {
      const r = await fetch("/api/alta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(datos) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setError(typeof j.error === "string" ? j.error : "No pudimos guardar tus datos. Probá de nuevo.");
      else setListo(true);
    } catch {
      setError("No hay conexión. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (listo)
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-green-700" />
        <p className="mt-3 font-display text-2xl font-bold text-brand-black">¡Listo, recibimos tus datos!</p>
        <p className="mt-2 max-w-sm text-brand-black/65">Los usamos para preparar tu documentación. Te vamos a contactar a la brevedad.</p>
      </div>
    );

  return (
    <form onSubmit={enviar} className="grid gap-4 sm:grid-cols-2">
      <input type="text" name="web" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-green-700 sm:col-span-2">Datos personales</p>
      <div>
        <label className={label} htmlFor="a-nombre">Nombre/s</label>
        <input id="a-nombre" name="nombre" required autoComplete="given-name" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-apellido">Apellido/s</label>
        <input id="a-apellido" name="apellido" required autoComplete="family-name" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-dni">DNI</label>
        <input id="a-dni" name="dni" required inputMode="numeric" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-cuit">CUIT / CUIL (opcional)</label>
        <input id="a-cuit" name="cuit" inputMode="numeric" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-email">Email</label>
        <input id="a-email" name="email" type="email" required autoComplete="email" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-tel">Teléfono / WhatsApp</label>
        <input id="a-tel" name="telefono" type="tel" required autoComplete="tel" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-nac">Nacionalidad</label>
        <input id="a-nac" name="nacionalidad" required defaultValue="Argentina" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-ec">Estado civil</label>
        <select id="a-ec" name="estadoCivil" required value={estadoCivil} onChange={(e) => setEstadoCivil(e.target.value)} className={input}>
          <option value="" disabled>Elegí una opción</option>
          {ESTADOS_CIVILES.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        {estadoCivil === "Casado/a" && (
          <select value={nupcias} onChange={(e) => setNupcias(e.target.value)} className={`${input} mt-2`} aria-label="Nupcias">
            <option value="primeras">en primeras nupcias</option>
            <option value="segundas">en segundas nupcias</option>
            <option value="terceras">en terceras nupcias</option>
          </select>
        )}
      </div>

      <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-green-700 sm:col-span-2">Domicilio real</p>
      <div className="sm:col-span-2">
        <label className={label} htmlFor="a-dom">Calle y número</label>
        <input id="a-dom" name="domicilio" required autoComplete="street-address" placeholder="Ej.: Diagonal Los Yaganes 2540" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-loc">Localidad</label>
        <input id="a-loc" name="localidad" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-par">Partido</label>
        <input id="a-par" name="partido" required className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-prov">Provincia</label>
        <input id="a-prov" name="provincia" required defaultValue="Buenos Aires" className={input} />
      </div>
      <div>
        <label className={label} htmlFor="a-int">¿Qué lote o propiedad? (opcional)</label>
        <input id="a-int" name="interes" placeholder="Ej.: Ayres de Guernica, Mz 2 Lote 14" className={input} />
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={enviando}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-green-700 px-6 py-3 text-base font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Enviar mis datos
        </button>
        <p className="text-xs text-brand-black/50">Tus datos se usan solo para preparar la documentación de tu operación.</p>
      </div>
    </form>
  );
}
