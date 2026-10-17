"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { contactoSchema, type ContactoInput } from "@/lib/schemas";

const inputClass =
  "w-full rounded-[14px] border-none bg-[#F2F5F3] px-3.5 py-3 text-base text-[#0F1F17] focus:outline-none focus:ring-2 focus:ring-[#08743E]/40";
const labelClass = "mb-1.5 block text-[13px] font-bold text-[#3D4F45]";
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
      <div className="flex flex-col items-center gap-2 rounded-[20px] bg-[#E8F5EC] p-10 text-center">
        <p className="text-xl font-extrabold">¡Gracias por escribirnos!</p>
        <p className="text-sm text-[#3D4F45]">En breve nos ponemos en contacto con vos.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-3 text-left"
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

      <label htmlFor="lc-visita" className="flex min-h-[44px] cursor-pointer items-center gap-3 py-1">
        <input
          id="lc-visita"
          type="checkbox"
          {...register("quiereVisita")}
          className="h-5 w-5 shrink-0 accent-[#08743E]"
        />
        <span className="text-[15px] font-bold text-[#0F1F17]">Quiero agendar una visita</span>
      </label>

      {estado === "error" && <p className="text-sm text-red-700">Ocurrió un error. Probá nuevamente.</p>}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#08743E] px-5 py-3.5 text-base font-extrabold text-white transition-colors hover:bg-[#065A30] disabled:opacity-60"
      >
        {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar
      </button>
    </form>
  );
}
