"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarCheck, Loader2 } from "lucide-react";
import { visitaSchema, type VisitaInput } from "@/lib/schemas";
import type { Proyecto } from "@/types/site";

const HORARIOS = ["09:00", "10:30", "12:00", "14:00", "15:30", "17:00", "19:00", "20:30", "22:00"];

export default function AgendaVisita({
  proyectoId,
  proyectos,
}: {
  proyectoId?: string;
  /** Si se pasan varios proyectos, se muestra un selector para que el visitante elija cuál desea conocer. */
  proyectos?: Proyecto[];
}) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const mostrarSelector = (proyectos?.length ?? 0) > 1;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<VisitaInput>({
    resolver: zodResolver(visitaSchema),
    defaultValues: { proyectoId: proyectoId ?? proyectos?.[0]?.id },
  });

  const onSubmit = async (data: VisitaInput) => {
    setEstado("enviando");
    try {
      const res = await fetch("/api/visitas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request-failed");
      setEstado("ok");
      reset();
    } catch {
      setEstado("error");
    }
  };

  const hoy = new Date().toISOString().split("T")[0];

  return (
    <section className="bg-brand-cream py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold text-brand-black sm:text-4xl">Coordiná tu visita</h2>
          <p className="mt-3 text-brand-black/70">Agendá una recorrida guiada por el barrio, sin cargo.</p>
        </div>

        <div className="mt-12">
          {estado === "ok" ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-green-600/30 bg-white p-10 text-center">
              <CalendarCheck className="h-12 w-12 text-brand-green-700" />
              <p className="font-display text-xl font-bold text-brand-black">¡Visita agendada!</p>
              <p className="text-sm text-brand-black/70">Te contactaremos para confirmar el horario elegido.</p>
              <button type="button" onClick={() => setEstado("idle")} className="mt-2 text-sm font-semibold text-brand-green-700 underline">
                Agendar otra visita
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-5 rounded-2xl border border-black/5 bg-white p-8 shadow-sm sm:grid-cols-2">
              {mostrarSelector ? (
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-brand-black/80">
                    ¿Qué desarrollo te interesa conocer?
                  </label>
                  <select
                    {...register("proyectoId")}
                    className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none"
                  >
                    {proyectos!.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <input type="hidden" {...register("proyectoId")} />
              )}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Nombre</label>
                <input {...register("nombre")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
                {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Teléfono</label>
                <input {...register("telefono")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
                {errors.telefono && <p className="mt-1 text-xs text-red-600">{errors.telefono.message}</p>}
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Email</label>
                <input type="email" {...register("email")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Fecha</label>
                <input type="date" min={hoy} {...register("fecha")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none" />
                {errors.fecha && <p className="mt-1 text-xs text-red-600">{errors.fecha.message}</p>}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Horario</label>
                <select defaultValue="" {...register("horario")} className="w-full rounded-lg border border-black/10 px-4 py-2.5 focus:border-brand-green-600 focus:outline-none">
                  <option value="" disabled>
                    Elegí un horario
                  </option>
                  {HORARIOS.map((h) => (
                    <option key={h} value={h}>
                      {h} hs
                    </option>
                  ))}
                </select>
                {errors.horario && <p className="mt-1 text-xs text-red-600">{errors.horario.message}</p>}
              </div>

              {estado === "error" && <p className="text-sm text-red-600 sm:col-span-2">Ocurrió un error. Intentá nuevamente.</p>}

              <button
                type="submit"
                disabled={estado === "enviando"}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-brand-green-700 px-8 py-3.5 font-semibold text-white transition hover:bg-brand-green-600 disabled:opacity-60 sm:col-span-2"
              >
                {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
                Agendar visita
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
