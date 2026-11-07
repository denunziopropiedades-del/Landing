import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  ETIQUETA_ESTADO,
  INSTITUCION,
  NOMBRE_TIPO,
  enmascararEmail,
  estadoEfectivo,
  fechaAr,
  monto,
  registrarAcceso,
  resolverToken,
  textoHonorariosReserva,
  type DatosLibreDeuda,
  type DatosReserva,
} from "@/lib/docs-clientes/core";
import { CLASE_ESTADO, EncabezadoInstitucional, PieInstitucional } from "@/components/docs-clientes/Institucional";
import DecisionReserva from "@/components/docs-clientes/DecisionReserva";
import { admitePagoMp, asegurarLinkPagoReserva, urlQrPago } from "@/lib/docs-clientes/pago";

export const metadata: Metadata = {
  title: "Mi documentación",
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export const dynamic = "force-dynamic";

const MENSAJE_ERROR: Record<string, string> = {
  invalido: "Este enlace no existe. Revisá que lo hayas copiado completo.",
  vencido: "Este enlace venció. Pedile a la inmobiliaria uno nuevo.",
  revocado: "Este enlace fue dado de baja. Pedile a la inmobiliaria uno nuevo.",
};

export default async function DocumentoClientePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  const acceso = admin ? await resolverToken(admin, token) : ({ ok: false, motivo: "invalido" } as const);

  if (!acceso.ok || !admin) {
    return (
      <main className="min-h-screen bg-slate-50 pb-12">
        <EncabezadoInstitucional titulo="Enlace no disponible" />
        <p className="mx-auto max-w-md p-6 text-center text-sm text-slate-600">
          {MENSAJE_ERROR[acceso.ok ? "invalido" : acceso.motivo]} Escribinos por WhatsApp al {INSTITUCION.whatsapp[0]}.
        </p>
        <PieInstitucional />
      </main>
    );
  }

  const { doc } = acceso;
  await registrarAcceso(admin, doc.id, acceso.linkId, "portal");
  const estado = estadoEfectivo(doc);
  const pdfUrl = `/api/cliente/documentos/${token}/pdf`;
  const verificarUrl = `/verificar/${doc.codigoVerificacion}`;

  let filas: { etiqueta: string; valor: string }[] = [];
  let resumen: { etiqueta: string; valor: string }[] = [];
  if (doc.tipo === "reserva") {
    const r = doc.datos as DatosReserva;
    filas = [
      { etiqueta: "Inmueble", valor: r.inmueble },
      ...(r.valorVenta ? [{ etiqueta: "Valor de venta", valor: monto(r.valorVenta, r.monedaVenta) }] : []),
      { etiqueta: "Reserva", valor: monto(r.importeReserva, r.monedaReserva) },
      ...(r.valorVenta && r.monedaVenta === r.monedaReserva ? [{ etiqueta: "Saldo de precio", valor: monto(r.valorVenta - r.importeReserva, r.monedaVenta) }] : []),
      ...(r.formaPagoSaldo ? [{ etiqueta: "Forma de pago del saldo", valor: r.formaPagoSaldo }] : []),
      ...(textoHonorariosReserva(r) ? [{ etiqueta: "Honorarios profesionales", valor: textoHonorariosReserva(r)! }] : []),
      ...(doc.venceEn ? [{ etiqueta: "Válida hasta", valor: fechaAr(doc.venceEn) }] : []),
    ];
    resumen = filas;
  } else {
    const l = doc.datos as DatosLibreDeuda;
    filas = [
      { etiqueta: l.origen === "lote" ? "Inmueble" : "Inmueble alquilado", valor: l.inmueble },
      { etiqueta: "Situación", valor: l.cancelacionTotal ? "Plan cancelado en su totalidad" : `Sin deuda vencida al ${fechaAr(l.alDia)}` },
      ...l.detalle.map((d) => ({ etiqueta: "", valor: d })),
    ];
  }

  // Pago de la reserva por Mercado Pago (se crea el link si todavía no existía).
  const puedePagar =
    doc.tipo === "reserva" && doc.pagoEstado !== "abonado" && estado !== "anulado" && estado !== "rechazado" && estado !== "vencido";
  const linkPago = puedePagar && admitePagoMp(doc) ? await asegurarLinkPagoReserva(admin, doc, "cliente") : null;

  const { data: decision } = await admin
    .from("doc_decisiones")
    .select("decision, creado_en")
    .eq("documento_id", doc.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <EncabezadoInstitucional titulo={doc.tipo === "reserva" ? "Mi reserva inmobiliaria" : "Mi certificado de libre deuda"} sub={doc.clienteNombre} />
      <div className="mx-auto max-w-2xl space-y-5 px-4 pt-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">{NOMBRE_TIPO[doc.tipo]}</p>
              <p className="text-lg font-bold text-slate-900">N.º {doc.numero}</p>
              <p className="text-xs text-slate-500">Emitido el {fechaAr(doc.emitidoEn)}</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${CLASE_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
          </div>

          <p className="mt-5 text-sm font-bold text-slate-900">Datos de la operación</p>
          <dl className="mt-2 divide-y divide-slate-100 text-sm">
            {filas.map((f, i) => (
              <div key={i} className="flex justify-between gap-4 py-2">
                {f.etiqueta && <dt className="text-slate-500">{f.etiqueta}</dt>}
                <dd className={`${f.etiqueta ? "text-right" : ""} font-medium text-slate-900`}>{f.valor}</dd>
              </div>
            ))}
          </dl>
        </section>

        {estado === "anulado" && (
          <section className="rounded-2xl bg-red-600 p-5 text-white shadow-sm">
            <p className="font-bold">Este documento fue anulado</p>
            {doc.anuladoMotivo && <p className="mt-1 text-sm">{doc.anuladoMotivo}</p>}
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm font-bold text-slate-900">Documento</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <span className="rounded-lg bg-red-50 px-2 py-2 text-xs font-bold text-red-700">PDF</span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{doc.numero}.pdf</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-full border border-[#16294f] px-4 py-2.5 text-center text-sm font-semibold text-[#16294f]">
              Ver PDF
            </a>
            <a href={`${pdfUrl}?descargar=1`} className="rounded-full bg-[#16294f] px-4 py-2.5 text-center text-sm font-semibold text-white">
              Descargar
            </a>
          </div>
          <iframe src={pdfUrl} title={`Documento ${doc.numero}`} className="mt-4 hidden h-[560px] w-full rounded-xl border border-slate-200 md:block" />
        </section>

        {doc.tipo === "reserva" && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900">Pago de la reserva</p>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  doc.pagoEstado === "abonado" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {doc.pagoEstado === "abonado" ? "Abonado" : "Pendiente"}
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {monto((doc.datos as DatosReserva).importeReserva, (doc.datos as DatosReserva).monedaReserva)}
            </p>
            {doc.pagoEstado === "abonado" ? (
              <p className="mt-1 text-sm text-slate-600">
                Pago registrado{doc.pagoEn ? ` el ${fechaAr(doc.pagoEn, true)} hs` : ""}
                {doc.pagoMedio === "mercadopago" ? " por Mercado Pago" : doc.pagoMedio ? ` (${doc.pagoMedio})` : ""}.
              </p>
            ) : linkPago ? (
              <div className="mt-3 space-y-3">
                <a
                  href={linkPago}
                  className="block rounded-full bg-[#009ee3] px-6 py-3 text-center font-semibold text-white shadow-sm"
                >
                  Pagar con Mercado Pago
                </a>
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={urlQrPago(doc)} alt="QR de pago de Mercado Pago" width={110} height={110} className="rounded-lg bg-white" />
                  <p className="text-xs text-slate-600">También podés escanear este QR con la app de Mercado Pago desde otro celular.</p>
                </div>
              </div>
            ) : puedePagar ? (
              <p className="mt-1 text-sm text-slate-600">Coordiná el pago con la inmobiliaria (transferencia o efectivo).</p>
            ) : null}
          </section>
        )}

        {doc.tipo === "reserva" && doc.aceptaHabilitada && (estado === "emitido" || estado === "enviado") && (
          <DecisionReserva
            token={token}
            numero={doc.numero}
            resumen={resumen}
            emailEnmascarado={enmascararEmail(doc.clienteEmail)}
            hash={doc.pdfSha256}
          />
        )}

        {decision && (estado === "aceptado" || estado === "rechazado") && (
          <section className={`rounded-2xl p-5 text-white shadow-sm ${estado === "aceptado" ? "bg-emerald-600" : "bg-red-600"}`}>
            <p className="font-bold">{estado === "aceptado" ? "Reserva aceptada" : "Reserva rechazada"}</p>
            <p className="mt-1 text-sm">Registrado el {fechaAr(decision.creado_en as string, true)} hs.</p>
          </section>
        )}

        {estado === "vencido" && (
          <section className="rounded-2xl bg-slate-200 p-5 text-slate-800 shadow-sm">
            <p className="font-bold">La reserva venció</p>
            <p className="mt-1 text-sm">El plazo de validez terminó el {fechaAr(doc.venceEn)}. Consultanos si querés renovarla.</p>
          </section>
        )}

        <section className="rounded-2xl bg-white p-5 text-sm shadow-sm">
          <p className="font-bold text-slate-900">Autenticidad</p>
          <p className="mt-1 text-slate-600">
            Código de verificación <b className="font-mono text-slate-900">{doc.codigoVerificacion}</b>. Cualquier persona (por ejemplo, una escribanía)
            puede comprobar que el documento es auténtico, sin ver tus datos personales.
          </p>
          <a href={verificarUrl} className="mt-2 inline-block font-semibold text-[#16294f] underline">
            Verificar autenticidad
          </a>
        </section>

        <a
          href={`https://wa.me/${INSTITUCION.whatsappIntl}?text=${encodeURIComponent(`Hola, consulta sobre mi documento N.º ${doc.numero}.`)}`}
          className="block rounded-full bg-[#25d366] px-6 py-3 text-center font-semibold text-white shadow-sm"
        >
          Consultas por WhatsApp
        </a>
      </div>
      <PieInstitucional />
    </main>
  );
}
