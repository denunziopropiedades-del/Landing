import type { Metadata } from "next";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { fechaAr, monto } from "@/lib/docs-clientes/compartido";
import { EncabezadoInstitucional, PieInstitucional } from "@/components/docs-clientes/Institucional";

export const metadata: Metadata = { title: "Pago de la reserva", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/** Página a la que vuelve el cliente desde Mercado Pago. No muestra datos personales. */
export default async function PagoReservaPage({
  params,
  searchParams,
}: {
  params: Promise<{ codigo: string }>;
  searchParams: Promise<{ status?: string; collection_status?: string }>;
}) {
  const { codigo } = await params;
  const sp = await searchParams;
  const limpio = codigo.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const admin = await getSupabaseAdminClient();
  const { data } =
    admin && limpio.length === 10
      ? await admin.from("doc_emitidos").select("numero, pago_estado, pago_monto, pago_en").eq("codigo_verificacion", limpio).maybeSingle()
      : { data: null };
  const mpStatus = sp.status ?? sp.collection_status ?? "";
  const abonado = data?.pago_estado === "abonado" || mpStatus === "approved";
  const fallo = !abonado && ["rejected", "failure", "null"].includes(mpStatus);

  return (
    <main className="min-h-screen bg-slate-50 pb-12">
      <EncabezadoInstitucional titulo="Pago de la reserva" sub={data ? `Reserva N.º ${data.numero}` : undefined} />
      <div className="mx-auto max-w-md px-4 pt-6">
        <section className={`rounded-2xl p-6 text-center text-white shadow-sm ${abonado ? "bg-emerald-600" : fallo ? "bg-red-600" : "bg-amber-500"}`}>
          <p className="text-3xl">{abonado ? "✓" : fallo ? "✗" : "⏳"}</p>
          <p className="text-lg font-bold">{abonado ? "¡Pago recibido!" : fallo ? "El pago no se pudo completar" : "Pago en proceso"}</p>
          <p className="mt-1 text-sm">
            {abonado
              ? `${data?.pago_monto ? `${monto(Number(data.pago_monto), "ARS")} · ` : ""}${data?.pago_en ? fechaAr(data.pago_en as string, true) + " hs. " : ""}Te enviamos la confirmación por mail.`
              : fallo
                ? "Podés volver a intentarlo desde el link de tu reserva o escribirnos por WhatsApp."
                : "Mercado Pago todavía está procesando el pago. Te avisamos por mail apenas se acredite."}
          </p>
        </section>
      </div>
      <PieInstitucional />
    </main>
  );
}
