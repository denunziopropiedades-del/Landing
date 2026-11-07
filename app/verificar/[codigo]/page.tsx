import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ETIQUETA_ESTADO, NOMBRE_TIPO, estadoEfectivo, fechaAr, iniciales, mapDoc } from "@/lib/docs-clientes/core";
import { CLASE_ESTADO, EncabezadoInstitucional, PieInstitucional } from "@/components/docs-clientes/Institucional";
import VerificarArchivo from "@/components/docs-clientes/VerificarArchivo";

export const metadata: Metadata = {
  title: "Verificación de documento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Verificación pública (QR): confirma autenticidad sin mostrar datos personales. */
export default async function VerificarPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  const admin = await getSupabaseAdminClient();
  const { data } = admin && limpio.length === 10
    ? await admin.from("doc_emitidos").select("*").eq("codigo_verificacion", limpio).maybeSingle()
    : { data: null };

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-50 pb-12">
        <EncabezadoInstitucional titulo="Verificación de documento" />
        <div className="mx-auto max-w-md px-4 pt-6">
          <section className="rounded-2xl bg-red-600 p-5 text-center text-white shadow-sm">
            <p className="text-lg font-bold">Documento no encontrado</p>
            <p className="mt-1 text-sm">El código {limpio || "ingresado"} no corresponde a ningún documento emitido por la inmobiliaria.</p>
          </section>
        </div>
        <PieInstitucional />
      </main>
    );
  }

  const doc = mapDoc(data);
  const estado = estadoEfectivo(doc);
  const valido = estado !== "anulado";
  const { data: decision } = admin
    ? await admin.from("doc_decisiones").select("decision, creado_en").eq("documento_id", doc.id).order("creado_en", { ascending: false }).limit(1).maybeSingle()
    : { data: null };

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <EncabezadoInstitucional titulo="Verificación de documento" />
      <div className="mx-auto max-w-xl space-y-5 px-4 pt-6">
        <section className={`rounded-2xl p-5 text-center text-white shadow-sm ${valido ? "bg-emerald-600" : "bg-red-600"}`}>
          <p className="text-3xl">{valido ? "✓" : "✗"}</p>
          <p className="text-lg font-bold">{valido ? "Documento auténtico" : "Documento ANULADO"}</p>
          <p className="mt-1 text-sm">
            {valido ? "Fue emitido por De Nunzio Negocios Inmobiliarios." : `Fue anulado el ${fechaAr(doc.anuladoEn)}. No tiene validez.`}
          </p>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <dl className="divide-y divide-slate-100 text-sm">
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Tipo</dt>
              <dd className="font-medium text-slate-900">{NOMBRE_TIPO[doc.tipo]}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Número</dt>
              <dd className="font-medium text-slate-900">{doc.numero}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Fecha de emisión</dt>
              <dd className="font-medium text-slate-900">{fechaAr(doc.emitidoEn)}</dd>
            </div>
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-slate-500">Titular</dt>
              <dd className="font-medium text-slate-900">{iniciales(doc.clienteNombre)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-2">
              <dt className="text-slate-500">Estado</dt>
              <dd>
                <span className={`rounded-full px-3 py-0.5 text-xs font-bold ${CLASE_ESTADO[estado]}`}>{ETIQUETA_ESTADO[estado]}</span>
              </dd>
            </div>
            {decision && (
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">{decision.decision === "aceptado" ? "Aceptada por el cliente" : "Rechazada por el cliente"}</dt>
                <dd className="font-medium text-slate-900">{fechaAr(decision.creado_en as string, true)} hs</dd>
              </div>
            )}
            {doc.tipo === "reserva" && doc.pagoEstado && (
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">Pago de la reserva</dt>
                <dd className="font-medium text-slate-900">{doc.pagoEstado === "abonado" ? "Abonado" : "Pendiente"}</dd>
              </div>
            )}
            {doc.tipo === "reserva" && doc.venceEn && (
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-slate-500">Válida hasta</dt>
                <dd className="font-medium text-slate-900">{fechaAr(doc.venceEn)}</dd>
              </div>
            )}
          </dl>
        </section>

        {doc.pdfSha256 && (
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-slate-900">¿Tenés el PDF? Comprobá que no fue modificado</p>
            <p className="mt-1 break-all font-mono text-[11px] text-slate-400">Huella SHA-256: {doc.pdfSha256}</p>
            <VerificarArchivo hash={doc.pdfSha256} />
          </section>
        )}

        <p className="text-center text-xs text-slate-500">
          Esta verificación no muestra datos personales. Para más información comunicate con la inmobiliaria.
        </p>
      </div>
      <PieInstitucional />
    </main>
  );
}
