"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, FileUp, ImagePlus, Loader2, X } from "lucide-react";
import {
  CV_MAX_BYTES,
  DISPONIBILIDADES,
  ENVIO_MAX_BYTES,
  EXPERIENCIAS,
  GRUPOS_PUESTOS,
  IMG_MAX_BYTES,
  IMG_MAX_CANTIDAD,
  PUESTOS,
  PUESTOS_CON_MATRICULA,
} from "@/lib/postulantes";

/**
 * Achica una imagen en el navegador (lado mayor 1600 px, JPEG 82 %) para que
 * las capturas del celular no pasen el límite de tamaño del envío.
 * Si el navegador no puede leerla, devuelve el archivo original.
 */
async function comprimirImagen(f: File): Promise<File> {
  try {
    const bmp = await createImageBitmap(f);
    const escala = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * escala);
    canvas.height = Math.round(bmp.height * escala);
    const ctx = canvas.getContext("2d");
    if (!ctx) return f;
    ctx.fillStyle = "#fff"; // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= f.size) return f;
    const nombre = f.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], nombre, { type: "image/jpeg" });
  } catch {
    return f;
  }
}

type ImagenElegida = { file: File; url: string };

const input =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-[15px] focus:border-brand-green-600 focus:outline-none";
const label = "mb-1 block text-xs font-semibold uppercase tracking-wide text-brand-black/55";

/** Formulario de "Trabajá con nosotros": datos, puesto, CV e imágenes adjuntas. */
export default function PostulanteForm({ puestoInicial = "" }: { puestoInicial?: string }) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [cv, setCv] = useState<File | null>(null);
  const [puesto, setPuesto] = useState(puestoInicial);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [imagenes, setImagenes] = useState<ImagenElegida[]>([]);
  const [procesando, setProcesando] = useState(false);

  // Libera las vistas previas al salir.
  const imagenesRef = useRef(imagenes);
  imagenesRef.current = imagenes;
  useEffect(() => () => imagenesRef.current.forEach((i) => URL.revokeObjectURL(i.url)), []);

  const elegirImagenes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const elegidas = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!elegidas.length) return;
    setError(null);
    const lugar = IMG_MAX_CANTIDAD - imagenes.length;
    if (elegidas.length > lugar) setError(`Podés adjuntar hasta ${IMG_MAX_CANTIDAD} imágenes.`);
    setProcesando(true);
    const nuevas: ImagenElegida[] = [];
    for (const f of elegidas.slice(0, Math.max(0, lugar))) {
      if (!f.type.startsWith("image/")) continue;
      const lista = await comprimirImagen(f);
      if (!["image/jpeg", "image/png", "image/webp"].includes(lista.type)) {
        setError("Ese formato de imagen no se puede subir. Probá con una captura JPG o PNG.");
        continue;
      }
      if (lista.size > IMG_MAX_BYTES) {
        setError(`La imagen "${f.name}" es demasiado pesada.`);
        continue;
      }
      nuevas.push({ file: lista, url: URL.createObjectURL(lista) });
    }
    setImagenes((v) => [...v, ...nuevas]);
    setProcesando(false);
  };

  const quitarImagen = (i: number) =>
    setImagenes((v) => {
      URL.revokeObjectURL(v[i].url);
      return v.filter((_, j) => j !== i);
    });

  const elegirCv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    if (f && f.size > CV_MAX_BYTES) {
      setError("El CV pesa más de 4 MB. Probá con un PDF más liviano.");
      e.target.value = "";
      setCv(null);
      return;
    }
    setError(null);
    setCv(f);
  };

  const quitarCv = () => {
    setCv(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const enviar = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setEstado("enviando");
    setError(null);
    try {
      const datos = new FormData(e.currentTarget);
      if (!cv) datos.delete("cv");
      datos.delete("imagenes");
      imagenes.forEach((i) => datos.append("imagenes", i.file));
      const total = (cv?.size ?? 0) + imagenes.reduce((t, i) => t + i.file.size, 0);
      if (total > ENVIO_MAX_BYTES) {
        throw new Error("Entre el CV y las imágenes superás los 4 MB. Sacá alguna imagen o usá un CV más liviano.");
      }
      const res = await fetch("/api/postulantes", { method: "POST", body: datos });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(typeof body?.error === "string" ? body.error : "No se pudo enviar.");
      setEstado("ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar.");
      setEstado("error");
    }
  };

  if (estado === "ok") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl bg-white p-8 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-green-600" />
        <p className="font-display text-xl font-bold text-brand-black">¡Recibimos tu postulación!</p>
        <p className="text-sm text-brand-black/70">
          Gracias por tu interés. Revisamos cada perfil y, si coincide con lo que buscamos, te contactamos por WhatsApp o mail.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      {/* Trampa para bots */}
      <input type="text" name="empresa" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div>
        <span className={label}>Puesto que te interesa</span>
        <select name="puesto" required value={puesto} onChange={(e) => setPuesto(e.target.value)} className={input}>
          <option value="" disabled>
            Elegí un puesto…
          </option>
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

      <input name="nombre" required minLength={2} placeholder="Nombre y apellido" autoComplete="name" className={input} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="telefono" required type="tel" inputMode="tel" placeholder="WhatsApp" autoComplete="tel" className={input} />
        <input name="email" required type="email" placeholder="Mail" autoComplete="email" className={input} />
      </div>
      <input name="localidad" required minLength={2} placeholder="¿Dónde vivís? (localidad / partido)" className={input} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={label}>Experiencia</span>
          <select name="experiencia" required defaultValue="" className={input}>
            <option value="" disabled>
              Elegí…
            </option>
            {EXPERIENCIAS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className={label}>Disponibilidad</span>
          <select name="disponibilidad" required defaultValue="" className={input}>
            <option value="" disabled>
              Elegí…
            </option>
            {DISPONIBILIDADES.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px]">
        <legend className="sr-only">Movilidad propia</legend>
        <span className="font-medium text-brand-black/75">¿Tenés movilidad propia?</span>
        <label className="flex items-center gap-2">
          <input type="radio" name="movilidad" value="si" required className="accent-brand-green-700" /> Sí
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="movilidad" value="no" className="accent-brand-green-700" /> No
        </label>
      </fieldset>

      {PUESTOS_CON_MATRICULA.includes(puesto) && (
        <input name="matricula" required placeholder="Matrícula (n.º y colegio / departamento judicial)" className={input} />
      )}
      <input name="linkedin" placeholder="LinkedIn o Instagram profesional (opcional)" className={input} />
      <textarea
        name="mensaje"
        rows={3}
        maxLength={2000}
        placeholder="Contanos un poco de vos y por qué te gustaría sumarte"
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] focus:border-brand-green-600 focus:outline-none"
      />

      <input
        ref={fileRef}
        id="cv"
        name="cv"
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={elegirCv}
        className="sr-only"
      />
      {cv ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-brand-green-600/40 bg-brand-green-700/5 px-4 py-3 text-sm">
          <span className="flex min-w-0 items-center gap-2 text-brand-black">
            <FileUp className="h-5 w-5 shrink-0 text-brand-green-700" />
            <span className="truncate">{cv.name}</span>
          </span>
          <button type="button" onClick={quitarCv} aria-label="Quitar CV" className="text-brand-black/50 hover:text-brand-black">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <label
          htmlFor="cv"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-white px-4 py-4 text-sm font-semibold text-brand-black/70 transition hover:border-brand-green-600 hover:text-brand-green-700"
        >
          <FileUp className="h-5 w-5" />
          Adjuntá tu CV (PDF o Word, hasta 4 MB)
        </label>
      )}

      <input
        ref={imgRef}
        id="imagenes"
        type="file"
        accept="image/*"
        multiple
        onChange={elegirImagenes}
        className="sr-only"
      />
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {imagenes.map((img, i) => (
            <div key={img.url} className="relative aspect-square overflow-hidden rounded-xl border border-black/10 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt={img.file.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => quitarImagen(i)}
                aria-label="Quitar imagen"
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {imagenes.length < IMG_MAX_CANTIDAD && (
        <label
          htmlFor="imagenes"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-black/15 bg-white px-4 py-4 text-center text-sm font-semibold text-brand-black/70 transition hover:border-brand-green-600 hover:text-brand-green-700"
        >
          {procesando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {imagenes.length
            ? `Agregar más imágenes (${imagenes.length}/${IMG_MAX_CANTIDAD})`
            : `Sumá capturas o imágenes (opcional, hasta ${IMG_MAX_CANTIDAD})`}
        </label>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={estado === "enviando" || procesando}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-brand-green-700 font-bold text-white transition hover:bg-brand-green-600 disabled:opacity-60"
      >
        {estado === "enviando" && <Loader2 className="h-5 w-5 animate-spin" />}
        Enviar postulación
      </button>
      <p className="text-center text-xs text-brand-black/50">
        Tus datos se usan solo para este proceso de selección. Ver{" "}
        <a href="/politica-de-privacidad" className="underline">
          política de privacidad
        </a>
        .
      </p>
    </form>
  );
}
