"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { addGaleriaItemAction, addGaleriaItemsMasivoAction, deleteGaleriaItemAction } from "@/lib/admin/actions";
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

function nombreSinExtension(nombreArchivo: string) {
  return nombreArchivo.replace(/\.[^/.]+$/, "");
}

type ItemCola = {
  id: string;
  nombreArchivo: string;
  titulo: string;
  categoria: ItemGaleria["categoria"];
  estado: "subiendo" | "listo" | "error";
  url: string;
  error?: string;
};

export default function GaleriaManager({ proyectoId, items }: { proyectoId: string; items: ItemGaleria[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(addGaleriaItemAction, null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [deletePending, startTransition] = useTransition();
  const cloudinaryListo = isCloudinaryConfigured();

  const [cola, setCola] = useState<ItemCola[]>([]);
  const [agregandoTodos, setAgregandoTodos] = useState(false);

  const actualizarItemCola = (id: string, patch: Partial<ItemCola>) => {
    setCola((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const handleFiles = async (files: FileList) => {
    const nuevos: ItemCola[] = Array.from(files).map((file) => ({
      id: crypto.randomUUID(),
      nombreArchivo: file.name,
      titulo: nombreSinExtension(file.name),
      categoria: file.type.startsWith("video/") ? "videos" : "fotos",
      estado: "subiendo",
      url: "",
    }));
    setCola((prev) => [...prev, ...nuevos]);

    Array.from(files).forEach((file, i) => {
      const id = nuevos[i].id;
      uploadToCloudinary(file)
        .then((url) => actualizarItemCola(id, { estado: "listo", url }))
        .catch((err) =>
          actualizarItemCola(id, {
            estado: "error",
            error: err instanceof Error ? err.message : "Error al subir el archivo",
          })
        );
    });
  };

  const quitarDeCola = (id: string) => setCola((prev) => prev.filter((it) => it.id !== id));

  const agregarTodosALaGaleria = async () => {
    const listos = cola.filter((it) => it.estado === "listo" && it.titulo.trim());
    if (listos.length === 0) return;
    setAgregandoTodos(true);
    try {
      const res = await addGaleriaItemsMasivoAction(
        listos.map((it) => ({ categoria: it.categoria, titulo: it.titulo.trim(), url: it.url })),
        proyectoId
      );
      if (!res.ok) {
        alert(`No se pudo agregar el contenido: ${res.error}`);
        return;
      }
      setCola((prev) => prev.filter((it) => !listos.some((l) => l.id === it.id)));
      router.refresh();
    } finally {
      setAgregandoTodos(false);
    }
  };

  const hayListosParaAgregar = cola.some((it) => it.estado === "listo" && it.titulo.trim());
  const haySubiendo = cola.some((it) => it.estado === "subiendo");

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este elemento de la galería?")) return;
    startTransition(() => {
      deleteGaleriaItemAction(id);
    });
  };

  return (
    <div className="space-y-8">
      {cloudinaryListo && (
        <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Subir fotos en cantidad</h2>
          <p className="mb-4 text-sm text-brand-black/60">
            Elegí varios archivos a la vez. A cada uno le podés poner su título y elegir su sección (Fotos, Drone,
            etc.) antes de agregarlo a la galería. <b>Para videos</b>, mejor subilos primero a YouTube y pegá el
            link en el formulario de abajo — así no cargamos nuestro almacenamiento con archivos pesados.
          </p>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-dashed border-black/20 px-4 py-3 text-sm text-brand-black/70 hover:border-brand-green-600"
          >
            <UploadCloud className="h-4 w-4" />
            Elegir archivos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {cola.length > 0 && (
            <div className="mt-5 space-y-2">
              {cola.map((it) => (
                <div key={it.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 p-2.5 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <input
                      value={it.titulo}
                      onChange={(e) => actualizarItemCola(it.id, { titulo: e.target.value })}
                      placeholder="Título"
                      className={inputClass}
                    />
                  </div>
                  <select
                    value={it.categoria}
                    onChange={(e) => actualizarItemCola(it.id, { categoria: e.target.value as ItemGaleria["categoria"] })}
                    className={`${inputClass} sm:w-40`}
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="flex w-full items-center justify-between gap-2 text-xs sm:w-auto sm:justify-start">
                    {it.estado === "subiendo" && (
                      <span className="inline-flex items-center gap-1 text-brand-black/50">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Subiendo...
                      </span>
                    )}
                    {it.estado === "listo" && <span className="text-brand-green-700">Listo</span>}
                    {it.estado === "error" && <span className="text-red-600">{it.error ?? "Error"}</span>}
                    <button
                      type="button"
                      onClick={() => quitarDeCola(it.id)}
                      className="text-brand-black/40 hover:text-red-600"
                      aria-label="Quitar de la lista"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={agregarTodosALaGaleria}
                disabled={!hayListosParaAgregar || agregandoTodos || haySubiendo}
                className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
              >
                {agregandoTodos && <Loader2 className="h-4 w-4 animate-spin" />}
                Agregar {cola.filter((it) => it.estado === "listo").length || ""} a la galería
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-1 font-display text-lg font-bold text-brand-black">Agregar videos de YouTube (o cualquier URL)</h2>
        <p className="mb-4 text-sm text-brand-black/60">
          Para videos: subilo a YouTube (puede ser &ldquo;no listado&rdquo; si no querés que aparezca en las
          búsquedas de YouTube) y pegá acá el link normal que te da el botón Compartir — lo convertimos solos al
          formato que necesita la página.
        </p>
        <form action={formAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="proyectoId" value={proyectoId} />
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
            <label className={labelClass}>URL</label>
            <input name="url" required placeholder="https://..." className={inputClass} />
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
