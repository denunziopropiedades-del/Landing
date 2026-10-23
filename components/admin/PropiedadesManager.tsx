"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2, UploadCloud, X } from "lucide-react";
import {
  eliminarPropiedadAction,
  publicarPropiedadAction,
  upsertPropiedadAction,
} from "@/lib/admin/propiedades-actions";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary-client";
import { BARRIOS, esRural, formatearPrecio, labelTipo, SITUACIONES, TIPOS, TIPOS_SIN_AMBIENTES, ubicacionTexto, type Propiedad } from "@/lib/propiedades-base";
import { ZONAS } from "@/lib/zonas";
import EditorTexto from "@/components/admin/EditorTexto";

const inputClass = "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function PropiedadForm({ propiedad, onDone }: { propiedad?: Propiedad; onDone: () => void }) {
  const [state, formAction, pending] = useActionState(upsertPropiedadAction, null);
  const [tipo, setTipo] = useState(propiedad?.tipo ?? "casa");
  const [operacion, setOperacion] = useState(propiedad?.operacion ?? "venta");
  const [fotos, setFotos] = useState<string[]>(propiedad?.fotos ?? []);
  const [subiendo, setSubiendo] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const rural = esRural(tipo);
  const cloudinaryListo = isCloudinaryConfigured();

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const subir = async (files: FileList) => {
    const lista = Array.from(files);
    setSubiendo(lista.length);
    for (const file of lista) {
      try {
        const url = await uploadToCloudinary(file);
        setFotos((f) => [...f, url]);
      } catch (err) {
        alert(err instanceof Error ? err.message : "No se pudo subir una foto.");
      } finally {
        setSubiendo((n) => n - 1);
      }
    }
  };

  const mover = (i: number, d: -1 | 1) =>
    setFotos((f) => {
      const j = i + d;
      if (j < 0 || j >= f.length) return f;
      const c = [...f];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  const unidadDefault = propiedad?.precioUnidad ?? (rural ? (operacion === "venta" ? "ha" : "ha_anio") : operacion === "alquiler" ? "mes" : "total");

  return (
    <form action={formAction} className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 sm:grid-cols-6">
      {propiedad && <input type="hidden" name="id" value={propiedad.id} />}
      <input type="hidden" name="fotos" value={fotos.join("\n")} />

      <div className="sm:col-span-2">
        <label className={labelClass}>Operación</label>
        <select name="operacion" value={operacion} onChange={(e) => setOperacion(e.target.value as typeof operacion)} className={inputClass}>
          <option value="venta">Venta</option>
          <option value="alquiler">{rural ? "Arrendamiento" : "Alquiler"}</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Tipo</label>
        <select name="tipo" value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} className={inputClass}>
          {TIPOS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Partido</label>
        <select name="partido" defaultValue={propiedad?.partido ?? ""} required className={inputClass}>
          <option value="">Elegí…</option>
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
      </div>

      <div className="sm:col-span-4">
        <label className={labelClass}>Título</label>
        <input
          name="titulo"
          defaultValue={propiedad?.titulo}
          required
          placeholder={rural ? "Campo agrícola-ganadero con casco" : "Casa 3 amb. con parque"}
          className={inputClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Localidad / barrio</label>
        <input name="localidad" defaultValue={propiedad?.localidad ?? ""} placeholder="Guernica" className={inputClass} />
      </div>
      <div className="sm:col-span-3">
        <label className={labelClass}>Dirección (opcional, se muestra en la ficha)</label>
        <input name="direccion" defaultValue={propiedad?.direccion ?? ""} className={inputClass} />
      </div>
      <div className="sm:col-span-3">
        <label className={labelClass}>Link de Google Maps (opcional)</label>
        <input name="mapsUrl" defaultValue={propiedad?.mapsUrl ?? ""} placeholder="https://maps.app.goo.gl/…" className={inputClass} />
      </div>

      <div className="sm:col-span-2">
        <label className={labelClass}>Precio (vacío = “Consultar”)</label>
        <input name="precio" inputMode="decimal" defaultValue={propiedad?.precio ?? ""} placeholder="68.000" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Moneda</label>
        <select name="moneda" defaultValue={propiedad?.moneda ?? (operacion === "alquiler" && !rural ? "ARS" : "USD")} className={inputClass}>
          <option value="USD">USD</option>
          <option value="ARS">$ (pesos)</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>El precio es…</label>
        <select key={`${tipo}-${operacion}`} name="precioUnidad" defaultValue={unidadDefault} className={inputClass}>
          <option value="total">Total</option>
          <option value="mes">Por mes</option>
          <option value="ha">Por hectárea</option>
          <option value="ha_anio">Por hectárea por año</option>
        </select>
      </div>
      {!rural && (
        <div>
          <label className={labelClass}>Expensas ($)</label>
          <input name="expensas" inputMode="numeric" defaultValue={propiedad?.expensas ?? ""} className={inputClass} />
        </div>
      )}

      {rural ? (
        <>
          <div>
            <label className={labelClass}>Hectáreas</label>
            <input name="hectareas" inputMode="decimal" defaultValue={propiedad?.hectareas ?? ""} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Aptitud</label>
            <input
              name="aptitud"
              list="aptitudes"
              defaultValue={propiedad?.aptitud ?? ""}
              placeholder="Agrícola-ganadero"
              className={inputClass}
            />
            <datalist id="aptitudes">
              {["Agrícola", "Ganadero", "Agrícola-ganadero", "Mixto", "Tambo", "Recreativo"].map((a) => (
                <option key={a} value={a} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Agua</label>
            <input name="agua" defaultValue={propiedad?.agua ?? ""} placeholder="Molino y tanque / perforación" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Luz</label>
            <select name="luz" defaultValue={propiedad?.luz === null || propiedad?.luz === undefined ? "" : propiedad.luz ? "si" : "no"} className={inputClass}>
              <option value="">Sin dato</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </>
      ) : (
        <>
          {!TIPOS_SIN_AMBIENTES.includes(tipo) && (
            <>
              <div>
                <label className={labelClass}>Ambientes</label>
                <input name="ambientes" inputMode="numeric" defaultValue={propiedad?.ambientes ?? ""} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Dormitorios</label>
                <input name="dormitorios" inputMode="numeric" defaultValue={propiedad?.dormitorios ?? ""} className={inputClass} />
              </div>
            </>
          )}
          <div>
            <label className={labelClass}>Baños</label>
            <input name="banos" inputMode="numeric" defaultValue={propiedad?.banos ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>M² cubiertos</label>
            <input name="supCubierta" inputMode="decimal" defaultValue={propiedad?.supCubierta ?? ""} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>M² totales</label>
            <input name="supTotal" inputMode="decimal" defaultValue={propiedad?.supTotal ?? ""} className={inputClass} />
          </div>

        </>
      )}

      <fieldset className="grid gap-3 rounded-xl bg-brand-cream p-3 sm:col-span-6 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="sr-only">Forma de pago y situación dominial</legend>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="aptoCredito" defaultChecked={propiedad?.aptoCredito} className="h-4 w-4" /> Apto crédito bancario
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="financiacionDirecta" defaultChecked={propiedad?.financiacionDirecta} className="h-4 w-4" /> Financiación directa
        </label>
        <div>
          <label className={labelClass} htmlFor="situacion">Situación dominial</label>
          <select id="situacion" name="situacion" defaultValue={propiedad?.situacion ?? ""} className={inputClass}>
            <option value="">Sin dato</option>
            {SITUACIONES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="barrio">Barrio</label>
          <select id="barrio" name="barrio" defaultValue={propiedad?.barrio ?? ""} className={inputClass}>
            <option value="">Sin dato</option>
            {BARRIOS.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      <div className="sm:col-span-6">
        <label className={labelClass}>Descripción</label>
        <EditorTexto
          name="descripcion"
          valorInicial={propiedad?.descripcion ?? ""}
          placeholder="Contá lo mejor de la propiedad. Podés usar negrita, cursiva, resaltar y elegir el tipo de letra."
        />
      </div>
      <div className="sm:col-span-6">
        <label className={labelClass}>Etiquetas (separadas por coma, se muestran sobre la foto)</label>
        <input
          name="etiquetas"
          defaultValue={propiedad?.etiquetas.join(", ")}
          placeholder={rural ? "Casco con vivienda, Con mangas" : "Con pileta, Acepta mascotas"}
          className={inputClass}
        />
      </div>

      <div className="sm:col-span-6">
        <label className={labelClass}>Fotos (la primera es la portada)</label>
        <div className="flex flex-wrap gap-2">
          {fotos.map((f, i) => (
            <div key={f} className="relative h-24 w-32 overflow-hidden rounded-lg border border-black/10 bg-brand-cream">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60 p-1 text-white">
                <button type="button" onClick={() => mover(i, -1)} aria-label="Mover antes">
                  <ArrowUp className="h-4 w-4 -rotate-90" />
                </button>
                <button type="button" onClick={() => setFotos((x) => x.filter((_, j) => j !== i))} aria-label="Quitar foto">
                  <X className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => mover(i, 1)} aria-label="Mover después">
                  <ArrowDown className="h-4 w-4 -rotate-90" />
                </button>
              </div>
              {i === 0 && <span className="absolute left-1 top-1 rounded bg-brand-gold-500 px-1.5 text-[10px] font-bold">PORTADA</span>}
            </div>
          ))}
          {cloudinaryListo ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={subiendo > 0}
              className="flex h-24 w-32 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-black/15 text-xs font-semibold text-brand-black/60 hover:border-brand-green-600"
            >
              {subiendo > 0 ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
              {subiendo > 0 ? `Subiendo ${subiendo}…` : "Subir fotos"}
            </button>
          ) : (
            <p className="text-xs text-brand-black/50">Cloudinary no está configurado: pegá links de fotos abajo.</p>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => e.target.files && subir(e.target.files)}
          />
        </div>
        <input
          placeholder="…o pegá el link de una foto y apretá Enter"
          className={`${inputClass} mt-2`}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = e.currentTarget.value.trim();
              if (/^https?:\/\//.test(v)) setFotos((f) => [...f, v]);
              e.currentTarget.value = "";
            }
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-5 sm:col-span-6">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="publicado" defaultChecked={propiedad?.publicado ?? true} /> Publicada en la web
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="destacado" defaultChecked={propiedad?.destacado} /> Destacada en el inicio
        </label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onDone} className="rounded-lg px-4 py-2 text-sm font-semibold text-brand-black/60 hover:bg-black/5">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={pending || subiendo > 0}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {propiedad ? "Guardar cambios" : "Crear propiedad"}
          </button>
        </div>
      </div>
      {state && !state.ok && <p className="text-sm text-red-600 sm:col-span-6">{state.error}</p>}
    </form>
  );
}

export default function PropiedadesManager({ propiedades, error }: { propiedades: Propiedad[]; error: string | null }) {
  const [editando, setEditando] = useState<string | "nueva" | null>(null);
  const [filtro, setFiltro] = useState<"todas" | "venta" | "alquiler" | "campos">("todas");
  const [, startTransition] = useTransition();

  const lista = propiedades.filter((p) =>
    filtro === "todas" ? true : filtro === "campos" ? esRural(p.tipo) : !esRural(p.tipo) && p.operacion === filtro
  );

  const accion = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok && "error" in r) alert(r.error);
    });

  if (error) {
    return <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">{error}</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["todas", "venta", "alquiler", "campos"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFiltro(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${filtro === f ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}
          >
            {f === "todas" ? "Todas" : f === "venta" ? "En venta" : f === "alquiler" ? "En alquiler" : "Campos"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setEditando("nueva")}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-600"
        >
          <Plus className="h-4 w-4" /> Nueva propiedad
        </button>
      </div>

      {editando === "nueva" && <PropiedadForm onDone={() => setEditando(null)} />}

      {lista.length === 0 && editando !== "nueva" && (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-brand-black/60">Todavía no hay propiedades cargadas.</p>
      )}

      <ul className="space-y-3">
        {lista.map((p) =>
          editando === p.id ? (
            <li key={p.id}>
              <PropiedadForm propiedad={p} onDone={() => setEditando(null)} />
            </li>
          ) : (
            <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-2xl border border-black/5 bg-white p-3">
              <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-brand-cream">
                {p.fotos[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.fotos[0]} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-semibold text-brand-black">
                  {p.destacado && <Star className="h-4 w-4 fill-brand-gold-500 text-brand-gold-500" />}
                  <span className="truncate">{p.titulo}</span>
                </p>
                <p className="text-xs text-brand-black/60">
                  {labelTipo(p.tipo)} · {p.operacion === "venta" ? "Venta" : esRural(p.tipo) ? "Arriendo" : "Alquiler"} · {ubicacionTexto(p)} ·{" "}
                  {formatearPrecio(p)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.publicado ? "bg-green-100 text-green-800" : "bg-black/5 text-black/50"}`}>
                {p.publicado ? "Publicada" : "Oculta"}
              </span>
              <div className="flex gap-1">
                {p.publicado && (
                  <Link href={`/propiedades/${p.slug}`} target="_blank" className="rounded-lg p-2 text-brand-black/60 hover:bg-black/5" title="Ver en la web">
                    <Eye className="h-4 w-4" />
                  </Link>
                )}
                <button
                  type="button"
                  title={p.publicado ? "Ocultar" : "Publicar"}
                  onClick={() => accion(() => publicarPropiedadAction(p.id, !p.publicado))}
                  className="rounded-lg p-2 text-brand-black/60 hover:bg-black/5"
                >
                  {p.publicado ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button type="button" title="Editar" onClick={() => setEditando(p.id)} className="rounded-lg p-2 text-brand-black/60 hover:bg-black/5">
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={() => confirm(`¿Eliminar "${p.titulo}"?`) && accion(() => eliminarPropiedadAction(p.id))}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  );
}
