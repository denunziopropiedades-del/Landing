"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { z } from "zod";
import { postulacionSchema, type PostulacionInput } from "@/lib/candidatos/schemas";

type FormValues = z.input<typeof postulacionSchema>;
import { CARGOS, CARGO_LABEL, DISPONIBILIDADES, DISPONIBILIDAD_LABEL } from "@/lib/candidatos/constants";
import { cn } from "@/lib/utils";

const input =
  "w-full rounded-lg border border-obra-slate-700 bg-obra-slate-900 px-4 py-2.5 text-white placeholder:text-white/30 focus:border-obra-orange-400 focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-white/80";
const error = "mt-1 text-xs text-red-400";
const section = "space-y-4 rounded-2xl border border-obra-slate-700 bg-obra-slate-900/50 p-6";
const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-obra-orange-400";
const checkboxRow = "flex items-center gap-2 text-sm text-white/80";

export default function FormularioPostulacion() {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [mensajeError, setMensajeError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, PostulacionInput>({ resolver: zodResolver(postulacionSchema) });

  const onSubmit = async (data: PostulacionInput) => {
    setEstado("enviando");
    setMensajeError("");
    try {
      const res = await fetch("/api/postulaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.formErrors?.[0] ?? "request-failed");
      }
      setEstado("ok");
      reset();
    } catch {
      setEstado("error");
      setMensajeError("No pudimos enviar tu postulación. Revisá los datos e intentá de nuevo.");
    }
  };

  if (estado === "ok") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-obra-orange-400/30 bg-obra-slate-900/50 p-10 text-center">
        <CheckCircle2 className="h-12 w-12 text-obra-orange-400" />
        <p className="text-lg font-bold text-white">¡Gracias por postularte!</p>
        <p className="text-sm text-white/70">
          Recibimos correctamente tus datos. Si tu perfil coincide con nuestras búsquedas, nos estaremos comunicando.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className={section}>
        <p className={sectionTitle}>Datos personales</p>
        <div>
          <label className={label}>Nombre y apellido</label>
          <input {...register("nombreApellido")} className={input} />
          {errors.nombreApellido && <p className={error}>{errors.nombreApellido.message}</p>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>DNI</label>
            <input inputMode="numeric" {...register("dni")} className={input} />
            {errors.dni && <p className={error}>{errors.dni.message}</p>}
          </div>
          <div>
            <label className={label}>Edad</label>
            <input type="number" {...register("edad")} className={input} />
            {errors.edad && <p className={error}>{errors.edad.message}</p>}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Teléfono / WhatsApp</label>
            <input inputMode="tel" placeholder="11 2345 6789" {...register("telefono")} className={input} />
            {errors.telefono && <p className={error}>{errors.telefono.message}</p>}
          </div>
          <div>
            <label className={label}>Localidad</label>
            <input {...register("localidad")} className={input} />
            {errors.localidad && <p className={error}>{errors.localidad.message}</p>}
          </div>
        </div>
      </div>

      <div className={section}>
        <p className={sectionTitle}>Perfil laboral</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Cargo al que te postulás</label>
            <select {...register("cargo")} className={input}>
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {CARGO_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Años de experiencia en construcción</label>
            <input type="number" step="0.5" {...register("anosExperiencia")} className={input} />
            {errors.anosExperiencia && <p className={error}>{errors.anosExperiencia.message}</p>}
          </div>
        </div>
        <div>
          <label className={label}>Especialidad</label>
          <input placeholder="Ej: colocación de cerámicos, pintura, plomería..." {...register("especialidad")} className={input} />
        </div>
        <div>
          <label className={label}>Trabajos que sabe realizar</label>
          <textarea rows={3} {...register("trabajosQueSabe")} className={input} />
        </div>
        <div>
          <label className={label}>Referencias laborales</label>
          <textarea rows={2} placeholder="Nombre de obras/empresas anteriores, contactos, etc." {...register("referenciasLaborales")} className={input} />
        </div>
        <label className={checkboxRow}>
          <input type="checkbox" {...register("experienciaComprobable")} className="h-4 w-4 accent-obra-orange-500" />
          Puedo comprobar mi experiencia (referencias, fotos de trabajos, etc.)
        </label>
      </div>

      <div className={section}>
        <p className={sectionTitle}>Disponibilidad y remuneración</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Disponibilidad para comenzar</label>
            <select {...register("disponibilidadInicio")} className={input}>
              <option value="">Elegí una opción</option>
              {DISPONIBILIDADES.map((d) => (
                <option key={d} value={d}>
                  {DISPONIBILIDAD_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Disponibilidad horaria</label>
            <input placeholder="Ej: full time, medio día..." {...register("disponibilidadHoraria")} className={input} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Pretensión salarial diaria ($ ARS)</label>
            <input type="number" placeholder="Ej: 50000" {...register("pretensionSalarialDiaria")} className={input} />
            {errors.pretensionSalarialDiaria && <p className={error}>{errors.pretensionSalarialDiaria.message}</p>}
          </div>
          <div>
            <label className={label}>Última remuneración diaria cobrada ($ ARS)</label>
            <input type="number" {...register("ultimaRemuneracionDiaria")} className={input} />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={checkboxRow}>
            <input type="checkbox" {...register("aceptaJornada")} className="h-4 w-4 accent-obra-orange-500" />
            Acepto trabajo por jornada
          </label>
          <label className={checkboxRow}>
            <input type="checkbox" {...register("aceptaObra")} className="h-4 w-4 accent-obra-orange-500" />
            Acepto trabajo por obra
          </label>
          <label className={checkboxRow}>
            <input type="checkbox" {...register("herramientasPropias")} className="h-4 w-4 accent-obra-orange-500" />
            Tengo herramientas propias
          </label>
          <label className={checkboxRow}>
            <input type="checkbox" {...register("movilidadPropia")} className="h-4 w-4 accent-obra-orange-500" />
            Tengo movilidad propia
          </label>
        </div>
      </div>

      <div className={section}>
        <p className={sectionTitle}>Observaciones</p>
        <textarea rows={3} placeholder="Algo más que quieras contarnos" {...register("observaciones")} className={input} />
      </div>

      {mensajeError && <p className={cn(error, "text-center")}>{mensajeError}</p>}

      <button
        type="submit"
        disabled={estado === "enviando"}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-obra-orange-500 px-8 py-3.5 font-semibold text-white transition hover:bg-obra-orange-400 disabled:opacity-60"
      >
        {estado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />}
        Enviar postulación
      </button>
    </form>
  );
}
