"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { ZONAS } from "@/lib/zonas";
import { TIPOS } from "@/lib/propiedades-base";

const input =
  "h-12 w-full rounded-xl border border-black/10 bg-white px-4 text-[15px] focus:border-brand-green-600 focus:outline-none";

/** Formulario de consulta por una propiedad, o de pedido de tasación (modo="tasacion"). */
export default function ConsultaForm({
  modo,
  propiedadId,
  mensajeInicial = "",
}: {
  modo: "propiedad" | "tasacion";
  propiedadId?: string;
  mensajeInicial?: string;
}) {
  const [f, setF] = useState({
    nombre: "",
    email: "",
    telefono: "",
    mensaje: mensajeInicial,
    operacion: "venta",
    tipo: "casa",
    partido: "",
    direccion: "",
  });
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado("enviando");
    setError(null);
    try {
      const res = await fetch("/api/consultas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: f.nombre,
          email: f.email,
          telefono: f.telefono,
          mensaje: f.mensaje || undefined,
          propiedadId: modo === "propiedad" ? propiedadId : undefined,
          tasacion:
            modo === "tasacion"
              ? { operacion: f.operacion, tipo: f.tipo, partido: f.partido, direccion: f.direccion || undefined }
              : undefined,
        }),
      });
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
        <p className="font-display text-xl font-bold text-brand-black">¡Recibimos tu {modo === "tasacion" ? "pedido" : "consulta"}!</p>
        <p className="text-sm text-brand-black/70">Te contactamos a la brevedad por WhatsApp o por mail.</p>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="space-y-3">
      {modo === "tasacion" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <select value={f.operacion} onChange={set("operacion")} className={input} aria-label="Querés">
            <option value="venta">Quiero vender</option>
            <option value="alquiler">Quiero alquilar / arrendar</option>
            <option value="ambas">Todavía no lo decidí</option>
          </select>
          <select value={f.tipo} onChange={set("tipo")} className={input} aria-label="Tipo de propiedad">
            {TIPOS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select value={f.partido} onChange={set("partido")} required className={input} aria-label="Partido">
            <option value="">Partido…</option>
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
          <input value={f.direccion} onChange={set("direccion")} placeholder="Dirección o localidad (opcional)" className={input} />
        </div>
      )}
      <input value={f.nombre} onChange={set("nombre")} required minLength={2} placeholder="Nombre y apellido" autoComplete="name" className={input} />
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={f.telefono} onChange={set("telefono")} required type="tel" inputMode="tel" placeholder="WhatsApp" autoComplete="tel" className={input} />
        <input value={f.email} onChange={set("email")} required type="email" placeholder="Mail" autoComplete="email" className={input} />
      </div>
      <textarea
        value={f.mensaje}
        onChange={set("mensaje")}
        rows={3}
        placeholder={modo === "tasacion" ? "Contanos de la propiedad (ambientes, m², hectáreas…)" : "Tu consulta"}
        className="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-[15px] focus:border-brand-green-600 focus:outline-none"
      />
      {estado === "error" && error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={estado === "enviando"}
        className="flex h-[52px] w-full items-center justify-center gap-2 rounded-full bg-brand-green-700 font-bold text-white transition hover:bg-brand-green-600 disabled:opacity-60"
      >
        {estado === "enviando" && <Loader2 className="h-5 w-5 animate-spin" />}
        {modo === "tasacion" ? "Pedir tasación" : "Enviar consulta"}
      </button>
    </form>
  );
}
