"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { reservaSchema, type ReservaInput } from "@/lib/schemas";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { formatUsd } from "@/lib/utils";
import type { Lote } from "@/types/site";

export default function ReservaForm({
  proyectoId,
  lotes,
  numero,
}: {
  proyectoId: string;
  lotes: Lote[];
  numero?: string;
}) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [ultimaReserva, setUltimaReserva] = useState<ReservaInput | null>(null);
  const [pago, setPago] = useState<"idle" | "cargando" | "no-disponible">("idle");

  const lotesDisponibles = useMemo(() => lotes.filter((l) => l.estado === "disponible"), [lotes]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReservaInput>({
    resolver: zodResolver(reservaSchema),
    defaultValues: { proyectoId },
  });

  const onSubmit = async (data: ReservaInput) => {
    setEstado("enviando");
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request-failed");

      const lote = lotesDisponibles.find((l) => l.id === data.loteId);
      const mensaje = `Hola, quiero confirmar mi reserva del Lote ${lote?.numero ?? ""} — Manzana ${lote?.manzana ?? ""} (${lote?.nombre ?? "lote"}). Nombre: ${data.nombre} ${data.apellido}, DNI: ${data.dni}, Tel: ${data.telefono}.`;
      window.open(buildWhatsappUrl(mensaje, numero), "_blank");

      setUltimaReserva(data);
      setEstado("ok");
      reset();
    } catch {
      setEstado("error");
    }
  };

  const pagarSena = async () => {
    if (!ultimaReserva) return;
    setPago("cargando");
    try {
      const res = await fetch("/api/mercadopago/crear-preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          loteId: ultimaReserva.loteId,
          nombre: `${ultimaReserva.nombre} ${ultimaReserva.apellido}`,
          email: ultimaReserva.email,
        }),
      });
      if (res.status === 503) {
        setPago("no-disponible");
        return;
      }
      const json = await res.json();
      if (json.initPoint) window.location.href = json.initPoint;
    } catch {
      setPago("no-disponible");
    }
  };

  if (estado === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-green-600/30 bg-brand-green-700/5 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-brand-green-700" />
        <p className="font-display text-xl font-bold text-brand-black">¡Reserva registrada!</p>
        <p className="text-sm text-brand-black/70">
          Te abrimos WhatsApp para confirmar los datos con nuestro equipo comercial. También recibirás un correo de
          confirmación.
        </p>

        <button
          type="button"
          onClick={pagarSena}
          disabled={pago === "cargando"}
          className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-[#009EE3] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
        >
          {pago === "cargando" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
          Pagar seña con Mercado Pago
        </button>
        {pago === "no-disponible" && (
          <p className="max-w-xs text-xs text-brand-black/50">
            El pago online todavía no está habilitado. Coordinamos el pago de la seña por WhatsApp.
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            setEstado("idle");
            setPago("idle");
          }}
          className="mt-2 text-sm font-semibold text-brand-green-700 underline"
        >
          Hacer otra reserva
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 rounded-2xl border border-black/5 bg-white p-8 shadow-sm sm:grid-cols-2">
      <input type="hidden" {...register("proyectoId")} />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Nombre</label>
        <input {...register("nombre")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
        {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Apellido</label>
        <input {...register("apellido")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
        {errors.apellido && <p className="mt-1 text-xs text-red-600">{errors.apellido.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">DNI</label>
        <input {...register("dni")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
        {errors.dni && <p className="mt-1 text-xs text-red-600">{errors.dni.message}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Email</label>
        <input type="email" {...register("email")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
        {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Teléfono</label>
        <input {...register("telefono")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
        {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>}
      </div>

      <div className="sm:col-span-2">
        <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Lote</label>
        <select {...register("loteId")} defaultValue="" className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none">
          <option value="" disabled>
            Seleccioná un lote disponible
          </option>
          {lotesDisponibles.map((l) => (
            <option key={l.id} value={l.id}>
              Manzana {l.manzana} — Lote {l.numero} ({l.superficieM2} m², {formatUsd(l.precioUsd)})
            </option>
          ))}
        </select>
        {errors.loteId && <p className="mt-1 text-xs text-red-600">{errors.loteId.message}</p>}
        {lotesDisponibles.length === 0 && (
          <p className="mt-1 text-xs text-brand-black/50">No hay lotes disponibles en este momento.</p>
        )}
      </div>

      <div className="flex items-start gap-2 sm:col-span-2">
        <input type="checkbox" id="terminos" {...register("terminos")} className="mt-1 h-4 w-4 accent-brand-green-700" />
        <label htmlFor="terminos" className="text-sm text-brand-black/70">
          Acepto los términos y condiciones de reserva y el tratamiento de mis datos personales.
        </label>
      </div>
      {errors.terminos && <p className="-mt-3 text-xs text-red-600 sm:col-span-2">{errors.terminos.message}</p>}

      {estado === "error" && (
        <p className="text-sm text-red-600 sm:col-span-2">
          Ocurrió un error al enviar tu reserva. Intentá nuevamente o escribinos por WhatsApp.
        </p>
      )}

      <button
        type="submit"
        disabled={estado === "enviando" || lotesDisponibles.length === 0}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-green-700 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-green-600 disabled:opacity-60 sm:col-span-2"
      >
        {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
        Reservar ahora
      </button>
    </form>
  );
}
