"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { addGaleriaItemAction, deleteGaleriaItemAction } from "@/lib/admin/actions";
import { isCloudinaryConfigured, uploadToCloudinary } from "@/lib/cloudinary-client";
import type { ItemGaleria } from "@/types/site";

const CATEGORIAS: { value: ItemGaleria["categoria"]; label: string }[] = [
  { value: "fotos", label: "Fotos" },
  { value: "videos", label: "Videos" },
  { value: "drone", label: "Drone" },
  { value: "plano", label: "Plano del barrio" },
  { value: "masterplan", label: "Masterplan" },
];

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

export default function GaleriaManager({ items }: { items: ItemGaleria[] }) {
  const [state, formAction, pending] = useActionState(addGaleriaItemAction, null);
  const [subiendo, setSubiendo] = useState(false);
  const [urlSubida, setUrlSubida] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [deletePending, startTransition] = useTransition();
  const cloudinaryListo = isCloudinaryConfigured();

  const handleFile = async (file: File) => {
    setSubiendo(true);
    try {
      const url = await uploadToCloudinary(file);
      setUrlSubida(url);
    } catch {
      alert("No se pudo subir el archivo. Verificá la configuración de Cloudinary.");
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este elemento de la galería?")) return;
    startTransition(() => {
      deleteGaleriaItemAction(id);
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Agregar contenido</h2>

        {cloudinaryListo && (
          <div className="mb-4">
            <label className={labelClass}>Subir imagen o video (Cloudinary)</label>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={subiendo}
              className="inline-flex items-center gap-2 rounded-lg border border-dashed border-black/20 px-4 py-3 text-sm text-brand-black/70 hover:border-brand-green-600 disabled:opacity-60"
            >
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              {subiendo ? "Subiendo..." : "Elegir archivo"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            {urlSubida && <p className="mt-2 truncate text-xs text-brand-green-700">Listo: {urlSubida}</p>}
          </div>
        )}

        <form action={formAction} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Categoría</label>
            <select name="categoria" required className={inputClass} defaultValue="fotos">
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Título</label>
            <input name="titulo" required className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>
              URL {cloudinaryListo ? "(se completa sola al subir un archivo, o pegá una manualmente)" : "de la imagen o video embebido"}
            </label>
            <input
              name="url"
              required
              defaultValue={urlSubida}
              key={urlSubida}
              placeholder="https://..."
              className={inputClass}
            />
          </div>
          <div className="flex items-end gap-3">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
            >
              {pending ? "Guardando..." : "Agregar a la galería"}
            </button>
            {state && !state.ok && <span className="text-xs text-red-600">{state.error}</span>}
          </div>
        </form>

        {!cloudinaryListo && (
          <p className="mt-3 text-xs text-brand-black/50">
            Configurá NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME y NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET para poder subir
            archivos directamente. Mientras tanto podés pegar URLs de imágenes o videos ya alojados.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((item) => (
          <div key={item.id} className="group relative overflow-hidden rounded-xl border border-black/5 bg-white">
            <div className="relative aspect-video bg-black/5">
              {item.categoria === "videos" ? (
                <div className="flex h-full items-center justify-center text-xs text-brand-black/50">Video</div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.url} alt={item.titulo} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="p-2">
              <p className="truncate text-xs font-medium text-brand-black">{item.titulo}</p>
              <p className="text-[10px] uppercase text-brand-black/40">{item.categoria}</p>
            </div>
            <button
              type="button"
              disabled={deletePending}
              onClick={() => eliminar(item.id)}
              className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
              aria-label="Eliminar"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-brand-black/50">Todavía no hay contenido en la galería.</p>
        )}
      </div>
    </div>
  );
}
