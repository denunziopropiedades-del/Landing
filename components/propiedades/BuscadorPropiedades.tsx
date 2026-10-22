"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { ZONAS } from "@/lib/zonas";

type Modo = "comprar" | "alquilar" | "campos" | "desarrollos";

const MODOS: { value: Modo; label: string }[] = [
  { value: "comprar", label: "Comprar" },
  { value: "alquilar", label: "Alquilar" },
  { value: "campos", label: "Campos" },
  { value: "desarrollos", label: "Desarrollos" },
];

const TIPOS_URBANOS = [
  { value: "", label: "Todos los tipos" },
  { value: "casa", label: "Casa" },
  { value: "departamento", label: "Departamento" },
  { value: "ph", label: "PH" },
  { value: "terreno", label: "Terreno" },
  { value: "local", label: "Local" },
];

const TIPOS_RURALES = [
  { value: "", label: "Campos y chacras" },
  { value: "campo", label: "Campo" },
  { value: "chacra", label: "Chacra" },
];

/** Buscador de la portada: operación + zona/partido + tipo. */
export default function BuscadorPropiedades() {
  const router = useRouter();
  const [modo, setModo] = useState<Modo>("comprar");
  const [ubicacion, setUbicacion] = useState("");
  const [tipo, setTipo] = useState("");

  const tipos = modo === "campos" ? TIPOS_RURALES : TIPOS_URBANOS;

  const buscar = () => {
    if (modo === "desarrollos") return router.push("/desarrollos");
    const params = new URLSearchParams();
    if (ubicacion.startsWith("zona:")) params.set("zona", ubicacion.slice(5));
    else if (ubicacion.startsWith("partido:")) params.set("partido", ubicacion.slice(8));
    if (tipo) params.set("tipo", tipo);
    const qs = params.toString();
    router.push(`/${modo}${qs ? `?${qs}` : ""}`);
  };

  const select =
    "w-full appearance-none rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] font-medium text-brand-black focus:border-brand-green-600 focus:outline-none";

  return (
    <div className="rounded-3xl bg-white p-2.5 text-brand-black shadow-2xl shadow-black/40 lg:flex lg:items-center lg:gap-2">
      <div className="grid grid-cols-4 rounded-2xl bg-brand-cream p-1 text-[13px] font-semibold sm:text-sm lg:flex">
        {MODOS.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => {
              setModo(m.value);
              setTipo("");
            }}
            className={`rounded-xl px-2 py-2.5 transition lg:px-4 ${
              modo === m.value ? "bg-brand-black text-white" : "text-brand-black/65 hover:text-brand-black"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {modo !== "desarrollos" && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:mt-0 lg:flex-1">
          <label className="block">
            <span className="sr-only">Zona o partido</span>
            <select value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={select}>
              <option value="">Todas las zonas</option>
              {ZONAS.map((z) => (
                <optgroup key={z.slug} label={z.nombre}>
                  <option value={`zona:${z.slug}`}>Toda la zona {z.nombre}</option>
                  {z.partidos.map((p) => (
                    <option key={p.slug} value={`partido:${p.slug}`}>
                      {p.nombre}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Tipo de propiedad</span>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={select}>
              {tipos.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <button
        type="button"
        onClick={buscar}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-green-700 px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-600 lg:mt-0 lg:w-auto"
      >
        <Search className="h-5 w-5" />
        {modo === "desarrollos" ? "Ver desarrollos" : "Buscar"}
      </button>
    </div>
  );
}
