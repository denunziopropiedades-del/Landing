import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { cargarPortal } from "@/lib/alquileres-server";
import {
  diasParaVencer,
  estadoCuota,
  fechaCorta,
  formatoMonto,
  hoyIso,
  nombrePeriodo,
  punitoriosCalculados,
  totalCuota,
  type ContratoAlq,
  type CuotaAlq,
} from "@/lib/alquileres";
import { isMercadoPagoConfigured } from "@/lib/mercadopago";

export const metadata: Metadata = {
  title: "Mi cuenta de alquiler",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const ETIQUETA: Record<string, { texto: string; clase: string }> = {
  pagada: { texto: "Pagado", clase: "bg-emerald-100 text-emerald-800" },
  vencida: { texto: "Vencido", clase: "bg-red-100 text-red-800" },
  por_vencer: { texto: "Por vencer", clase: "bg-amber-100 text-amber-800" },
  futura: { texto: "Próximo", clase: "bg-slate-100 text-slate-700" },
};

function Encabezado({ titulo, sub }: { titulo: string; sub?: string }) {
  return (
    <header className="bg-[#0f1b2d] px-4 py-8 text-center text-white">
      <p className="text-xs font-semibold uppercase tracking-widest text-[#6cc72f]">De Nunzio Negocios Inmobiliarios</p>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{titulo}</h1>
      {sub && <p className="mt-1 text-sm text-white/70">{sub}</p>}
    </header>
  );
}

export default async function MiAlquilerPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ pago?: string }>;
}) {
  const { token } = await params;
  const { pago } = await searchParams;
  const admin = await getSupabaseAdminClient();
  const portal = admin ? await cargarPortal(admin, token) : null;

  if (!portal) {
    return (
      <main className="min-h-screen bg-slate-50">
        <Encabezado titulo="Link no válido" />
        <p className="mx-auto max-w-md p-6 text-center text-sm text-slate-600">
          Este link no existe o fue renovado. Pedile a la inmobiliaria tu link actualizado por WhatsApp al 11-2742-4512.
        </p>
      </main>
    );
  }

  const { persona, datos } = portal;
  const hoy = hoyIso();
  const mp = isMercadoPagoConfigured();
  const esInquilino = persona.tipo === "inquilino";

  return (
    <main className="min-h-screen bg-slate-50 pb-16">
      <Encabezado titulo={esInquilino ? "Mi alquiler" : "Mis propiedades en alquiler"} sub={persona.nombre} />
      <div className="mx-auto max-w-2xl space-y-6 px-4 pt-6">
        {pago === "ya-pagado" && <Aviso texto="Ese mes ya figura como pagado." />}
        {pago === "error" && <Aviso texto="No se pudo abrir Mercado Pago. Probá de nuevo en un rato o escribinos por WhatsApp." error />}
        {pago === "no-disponible" && <Aviso texto="El pago online no está disponible para este contrato. Consultanos por WhatsApp." error />}

        {datos.contratos.length === 0 && (
          <p className="rounded-xl bg-white p-4 text-sm text-slate-600 shadow-sm">Todavía no hay contratos cargados a tu nombre.</p>
        )}

        {datos.contratos.map((contrato) => {
          const cuotas = datos.cuotas.filter((c) => c.contratoId === contrato.id);
          const pendientes = cuotas.filter((c) => !c.pagadoEn).sort((a, b) => a.vencimiento.localeCompare(b.vencimiento));
          const proxima = pendientes[0];
          const deuda = pendientes.filter((c) => c.vencimiento < hoy).reduce((s, c) => s + totalCuota(c, contrato, hoy), 0);
          const servicios = datos.servicios.filter((s) => s.contratoId === contrato.id);
          const liquidaciones = datos.liquidaciones.filter((l) => l.contratoId === contrato.id);
          const venceEn = diasParaVencer(contrato.fechaFin, hoy);

          return (
            <section key={contrato.id} className="space-y-4">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">Propiedad</p>
                <p className="text-lg font-bold text-slate-900">{contrato.direccion}</p>
                {contrato.localidad && <p className="text-sm text-slate-600">{contrato.localidad}</p>}
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <Dato etiqueta="Alquiler actual" valor={formatoMonto(contrato.montoActual, contrato.moneda)} />
                  <Dato etiqueta="Vence cada mes el día" valor={String(contrato.diaVencimiento)} />
                  <Dato etiqueta="Contrato" valor={`${fechaCorta(contrato.fechaInicio)} al ${fechaCorta(contrato.fechaFin)}`} />
                  {contrato.proximoAjuste && <Dato etiqueta="Próximo ajuste" valor={fechaCorta(contrato.proximoAjuste)} />}
                </div>
                {contrato.estado === "activo" && venceEn >= 0 && venceEn <= 90 && (
                  <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">El contrato vence en {venceEn} días.</p>
                )}
              </div>

              {esInquilino && proxima && (
                <ProximoPago cuota={proxima} contrato={contrato} token={token} mp={mp} deuda={deuda} hoy={hoy} />
              )}

              {!esInquilino && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Inquilino al día</p>
                    <p className={`text-lg font-bold ${deuda > 0 ? "text-red-700" : "text-emerald-700"}`}>
                      {deuda > 0 ? `Debe ${formatoMonto(deuda, contrato.moneda)}` : "Sí"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white p-4 shadow-sm">
                    <p className="text-xs text-slate-500">Cobrado sin liquidar</p>
                    <p className="text-lg font-bold text-slate-900">
                      {formatoMonto(
                        cuotas.filter((c) => c.pagadoEn && !c.liquidacionId).reduce((s, c) => s + (c.pagadoMonto ?? 0), 0),
                        contrato.moneda
                      )}
                    </p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">Historial de pagos</h2>
                <ul className="mt-3 divide-y divide-slate-100">
                  {cuotas
                    .filter((c) => c.periodo <= hoy || c.pagadoEn)
                    .map((c) => {
                      const e = estadoCuota(c, hoy);
                      return (
                        <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                          <div>
                            <p className="font-medium capitalize text-slate-900">{nombrePeriodo(c.periodo)}</p>
                            <p className="text-xs text-slate-500">
                              {c.pagadoEn
                                ? `Pagado el ${fechaCorta(c.pagadoEn)} · ${formatoMonto(c.pagadoMonto ?? 0, contrato.moneda)}`
                                : `Vence el ${fechaCorta(c.vencimiento)} · ${formatoMonto(totalCuota(c, contrato, hoy), contrato.moneda)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ETIQUETA[e].clase}`}>{ETIQUETA[e].texto}</span>
                            {c.pagadoEn && (
                              <a href={`/api/alquileres/recibo/${c.id}?t=${token}`} target="_blank" className="text-xs font-semibold text-[#2f7d16] underline">
                                Recibo
                              </a>
                            )}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>

              {servicios.length > 0 && (
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="font-bold text-slate-900">Expensas, impuestos y servicios</h2>
                  <ul className="mt-3 divide-y divide-slate-100">
                    {servicios.slice(0, 24).map((s) => (
                      <li key={s.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">
                            {s.concepto}
                            {s.periodo ? ` · ${nombrePeriodo(s.periodo)}` : ""}
                          </p>
                          <p className="text-xs text-slate-500">
                            A cargo del {s.aCargo}
                            {s.vencimiento ? ` · vence ${fechaCorta(s.vencimiento)}` : ""}
                            {s.monto ? ` · ${formatoMonto(s.monto, contrato.moneda)}` : ""}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.pagado ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          {s.pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!esInquilino && (
                <div className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="font-bold text-slate-900">Liquidaciones</h2>
                  {liquidaciones.length === 0 && <p className="mt-2 text-sm text-slate-500">Todavía no hay liquidaciones.</p>}
                  <ul className="mt-3 divide-y divide-slate-100">
                    {liquidaciones.map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                        <div>
                          <p className="font-medium text-slate-900">Neto {formatoMonto(l.neto, contrato.moneda)}</p>
                          <p className="text-xs text-slate-500">
                            Cobrado {formatoMonto(l.cobrado, contrato.moneda)} · comisión {formatoMonto(l.comision, contrato.moneda)}
                            {l.gastos ? ` · gastos ${formatoMonto(l.gastos, contrato.moneda)}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${l.pagadaEn ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {l.pagadaEn ? `Pagada ${fechaCorta(l.pagadaEn)}` : "A pagar"}
                          </span>
                          <a href={`/api/alquileres/liquidacion/${l.id}?t=${token}`} target="_blank" className="text-xs font-semibold text-[#2f7d16] underline">
                            PDF
                          </a>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}

        <p className="text-center text-xs text-slate-500">
          ¿Dudas? Escribinos por WhatsApp al{" "}
          <a href="https://wa.me/5491127424512" className="font-semibold underline">
            11-2742-4512
          </a>
          . Este link es personal: no lo compartas.
        </p>
      </div>
    </main>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{etiqueta}</p>
      <p className="font-semibold text-slate-900">{valor}</p>
    </div>
  );
}

function Aviso({ texto, error }: { texto: string; error?: boolean }) {
  return <p className={`rounded-lg px-3 py-2 text-sm ${error ? "bg-red-50 text-red-800" : "bg-emerald-50 text-emerald-800"}`}>{texto}</p>;
}

function ProximoPago({
  cuota,
  contrato,
  token,
  mp,
  deuda,
  hoy,
}: {
  cuota: CuotaAlq;
  contrato: ContratoAlq;
  token: string;
  mp: boolean;
  deuda: number;
  hoy: string;
}) {
  const punit = punitoriosCalculados(cuota, contrato, hoy);
  const vencida = cuota.vencimiento < hoy;
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${vencida ? "bg-red-50" : "bg-white"}`}>
      <p className="text-xs font-semibold uppercase text-slate-500">{vencida ? "Pago vencido" : "Próximo pago"}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{formatoMonto(totalCuota(cuota, contrato, hoy), contrato.moneda)}</p>
      <p className="text-sm capitalize text-slate-600">
        {nombrePeriodo(cuota.periodo)} · vence el {fechaCorta(cuota.vencimiento)}
      </p>
      <div className="mt-2 space-y-0.5 text-xs text-slate-600">
        <p>Alquiler: {formatoMonto(cuota.monto, contrato.moneda)}</p>
        {cuota.extras > 0 && (
          <p>
            {cuota.extrasDetalle || "Expensas / otros"}: {formatoMonto(cuota.extras, contrato.moneda)}
          </p>
        )}
        {punit > 0 && <p className="text-red-700">Intereses por mora a hoy: {formatoMonto(punit, contrato.moneda)}</p>}
        {deuda > totalCuota(cuota, contrato, hoy) + 0.01 && (
          <p className="font-semibold text-red-700">Deuda total vencida: {formatoMonto(deuda, contrato.moneda)}</p>
        )}
      </div>
      {mp && contrato.moneda === "ARS" ? (
        <a
          href={`/api/alquileres/pagar/${cuota.id}?t=${token}`}
          className="mt-4 block rounded-xl bg-[#009ee3] px-4 py-3 text-center text-sm font-bold text-white"
        >
          Pagar con Mercado Pago
        </a>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        También podés pagar por transferencia o en efectivo en la inmobiliaria. Si transferís, mandanos el comprobante por WhatsApp.
      </p>
    </div>
  );
}
