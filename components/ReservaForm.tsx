"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { reservaObjectSchema, type ReservaInput } from "@/lib/schemas";
import { buildWhatsappUrl } from "@/lib/whatsapp";
import { formatUsd } from "@/lib/utils";
import { useSeleccionLotes } from "@/components/SeleccionLotesContext";
import type { ComboLotes, Lote, PlanFinanciacionFijo } from "@/types/site";

type DatosFormulario = Omit<ReservaInput, "loteIds" | "formaPago" | "planFinanciacion">;

export default function ReservaForm({
  proyectoId,
  lotes,
  numero,
  comboLotes,
  planesFinanciacion,
}: {
  proyectoId: string;
  lotes: Lote[];
  numero?: string;
  comboLotes?: ComboLotes | null;
  planesFinanciacion?: PlanFinanciacionFijo[];
}) {
  const [estado, setEstado] = useState<"idle" | "enviando" | "ok" | "error">("idle");
  const [ultimaReserva, setUltimaReserva] = useState<ReservaInput | null>(null);
  const [ultimoLeadId, setUltimoLeadId] = useState<string | null>(null);
  const [pago, setPago] = useState<"idle" | "cargando" | "no-disponible">("idle");
  const [errorSeleccion, setErrorSeleccion] = useState("");
  const [formaPago, setFormaPago] = useState<"contado" | "financiado">("contado");
  const [planIndex, setPlanIndex] = useState<number | null>(null);
  const [errorPlan, setErrorPlan] = useState("");
  const { seleccionados, toggleSeleccion, limiteAlcanzado } = useSeleccionLotes();
  const planes = planesFinanciacion ?? [];

  const lotesDisponibles = useMemo(
    () =>
      lotes
        .filter((l) => l.estado === "disponible")
        .sort(
          (a, b) =>
            a.manzana.localeCompare(b.manzana, undefined, { numeric: true }) ||
            a.numero.localeCompare(b.numero, undefined, { numeric: true })
        ),
    [lotes]
  );

  const lotesElegidos = useMemo(
    () => lotesDisponibles.filter((l) => seleccionados.includes(l.id)),
    [lotesDisponibles, seleccionados]
  );

  const totalUsd = useMemo(() => {
    if (comboLotes) {
      if (lotesElegidos.length === 2 && comboLotes.precio2LotesUsd) return comboLotes.precio2LotesUsd;
      if (lotesElegidos.length === 3 && comboLotes.precio3LotesUsd) return comboLotes.precio3LotesUsd;
    }
    return lotesElegidos.reduce((acc, l) => acc + l.precioUsd, 0);
  }, [lotesElegidos, comboLotes]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DatosFormulario>({
    resolver: zodResolver(reservaObjectSchema.omit({ loteIds: true, formaPago: true, planFinanciacion: true })),
    defaultValues: { proyectoId },
  });

  const onSubmit = async (datosFormulario: DatosFormulario) => {
    if (seleccionados.length === 0) {
      setErrorSeleccion("Elegí al menos un lote de la lista.");
      return;
    }
    setErrorSeleccion("");

    if (formaPago === "financiado" && planIndex === null) {
      setErrorPlan("Elegí uno de los planes de financiación.");
      return;
    }
    setErrorPlan("");

    const planFinanciacion = formaPago === "financiado" && planIndex !== null ? planes[planIndex] : null;
    const data: ReservaInput = { ...datosFormulario, loteIds: seleccionados, formaPago, planFinanciacion };

    setEstado("enviando");
    try {
      const res = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("request-failed");
      const json: { leadId?: string | null } = await res.json();

      const detalleLotes = lotesElegidos.map((l) => `Lote ${l.numero} (Manzana ${l.manzana})`).join(", ");
      const mensaje = `Hola, quiero confirmar mi reserva de ${lotesElegidos.length === 1 ? "el" : "los"} ${detalleLotes}. Nombre: ${data.nombre} ${data.apellido}, DNI: ${data.dni}, Tel: ${data.telefono}.`;
      window.open(buildWhatsappUrl(mensaje, numero), "_blank");

      setUltimaReserva(data);
      setUltimoLeadId(json.leadId ?? null);
      setEstado("ok");
      reset();
    } catch {
      setEstado("error");
    }
  };

  const pagarSena = async () => {
    if (!ultimaReserva || !ultimoLeadId) return;
    setPago("cargando");
    try {
      const res = await fetch("/api/mercadopago/crear-preferencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: ultimoLeadId,
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
          disabled={pago === "cargando" || !ultimoLeadId}
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
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium text-brand-black/80">Lotes (elegí hasta 3)</label>
          {limiteAlcanzado && <span className="text-xs text-brand-black/50">Llegaste al máximo de 3 lotes</span>}
        </div>
        <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-black/10 p-2">
          {lotesDisponibles.map((l) => {
            const marcado = seleccionados.includes(l.id);
            return (
              <label
                key={l.id}
                className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm ${marcado ? "bg-brand-green-700/10" : "hover:bg-black/5"}`}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={!marcado && limiteAlcanzado}
                    onChange={() => toggleSeleccion(l.id)}
                    className="h-4 w-4 accent-brand-green-700"
                  />
                  Manzana {l.manzana} — Lote {l.numero} ({l.superficieM2} m²)
                </span>
                <span className="text-brand-black/60">{formatUsd(l.precioUsd)}</span>
              </label>
            );
          })}
          {lotesDisponibles.length === 0 && (
            <p className="px-2 py-1 text-xs text-brand-black/50">No hay lotes disponibles en este momento.</p>
          )}
        </div>
        {errorSeleccion && <p className="mt-1 text-xs text-red-600">{errorSeleccion}</p>}
      </div>

      {lotesElegidos.length > 0 && (
        <div className="sm:col-span-2 rounded-xl border border-brand-green-600/30 bg-brand-green-700/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-black/50">
            {lotesElegidos.length} lote{lotesElegidos.length > 1 ? "s" : ""} seleccionado{lotesElegidos.length > 1 ? "s" : ""}
          </p>
          <ul className="space-y-1 text-sm text-brand-black/80">
            {lotesElegidos.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>
                  Manzana {l.manzana} — Lote {l.numero} ({l.superficieM2} m²)
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 flex items-center justify-between font-display text-lg font-bold text-brand-green-700">
            <span>Total</span>
            <span>{formatUsd(totalUsd)}</span>
          </p>
        </div>
      )}

      {planes.length > 0 && (
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-brand-black/80">Forma de pago</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setFormaPago("contado");
                setPlanIndex(null);
                setErrorPlan("");
              }}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                formaPago === "contado"
                  ? "border-brand-green-600 bg-brand-green-700/10 text-brand-green-700"
                  : "border-black/10 text-brand-black/60 hover:border-black/20"
              }`}
            >
              Contado
            </button>
            <button
              type="button"
              onClick={() => setFormaPago("financiado")}
              className={`flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                formaPago === "financiado"
                  ? "border-brand-green-600 bg-brand-green-700/10 text-brand-green-700"
                  : "border-black/10 text-brand-black/60 hover:border-black/20"
              }`}
            >
              Financiado
            </button>
          </div>

          {formaPago === "financiado" && (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {planes.map((plan, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setPlanIndex(i);
                    setErrorPlan("");
                  }}
                  className={`rounded-lg border p-3 text-left text-sm transition ${
                    planIndex === i
                      ? "border-brand-green-600 bg-brand-green-700/10"
                      : "border-black/10 hover:border-black/20"
                  }`}
                >
                  <p className="text-xs text-brand-black/50">Anticipo</p>
                  <p className="font-semibold text-brand-black">{formatUsd(plan.anticipoUsd)}</p>
                  <p className="mt-1.5 text-xs text-brand-black/50">
                    {plan.cuotas} cuotas de {formatUsd(plan.valorCuotaUsd)}
                  </p>
                </button>
              ))}
            </div>
          )}
          {errorPlan && <p className="mt-1 text-xs text-red-600">{errorPlan}</p>}
        </div>
      )}

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
