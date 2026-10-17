"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { contactoSchema, type ContactoInput } from "@/lib/schemas";

const inputClass =
  "w-full rounded-xl border border-[#DCD8CC] bg-white px-4 py-3 text-base text-[#1B2A22] focus:border-[#0F5C38] focus:outline-none focus:ring-2 focus:ring-[#0F5C38]/20";
const labelClass = "mb-1.5 block text-sm font-medium text-[#1B2A22]";
const errorClass = "mt-1 text-xs text-red-700";

export default function LandingContactForm() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactoInput>({ resolver: zodResolver(contactoSchema) });

  const onSubmit = async (data: ContactoInput) => {
    setEstado("enviando");
    try {
      const res = await fetch("/api/contacto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, mensaje: `[Landing] ${data.mensaje}` }),
      });
      if (!res.ok) throw new Error("request-failed");
      setEstado("ok");
      reset();
      // Evento Lead para el Pixel de Meta (si está cargado).
      const w = window as unknown as { fbq?: (...args: unknown[]) => void };
      w.fbq?.("track", "Lead");
    } catch {
      setEstado("error");
    }
  };

  if (estado === "ok") {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-[#DCD8CC] bg-white p-10 text-center">
        <p className="font-display text-xl font-bold">¡Gracias por escribirnos!</p>
        <p className="text-sm text-[#4A5A50]">En breve nos ponemos en contacto con vos.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-4 rounded-2xl border border-[#DCD8CC] bg-white p-6 text-left sm:p-8"
    >
      <div>
        <label htmlFor="lc-nombre" className={labelClass}>Nombre y apellido</label>
        <input id="lc-nombre" autoComplete="name" {...register("nombre")} className={inputClass} />
        {errors.nombre && <p className={errorClass}>{errors.nombre.message}</p>}
      </div>
      <div>
        <label htmlFor="lc-telefono" className={labelClass}>Teléfono</label>
        <input id="lc-telefono" type="tel" autoComplete="tel" {...register("telefono")} className={inputClass} />
        {errors.telefono && <p className={errorClass}>{errors.telefono.message}</p>}
      </div>
      <div>
        <label htmlFor="lc-email" className={labelClass}>Mail</label>
        <input id="lc-email" type="email" autoComplete="email" {...register("email")} className={inputClass} />
        {errors.email && <p className={errorClass}>{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="lc-mensaje" className={labelClass}>Mensaje</label>
        <textarea id="lc-mensaje" rows={4} {...register("mensaje")} className={inputClass} />
        {errors.mensaje && <p className={errorClass}>{errors.mensaje.message}</p>}
      </div>

      {estado === "error" && <p className="text-sm text-red-700">Ocurrió un error. Probá nuevamente.</p>}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#0F5C38] px-5 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#0B4A2D] disabled:opacity-60"
      >
        {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar
      </button>
    </form>
  );
}
