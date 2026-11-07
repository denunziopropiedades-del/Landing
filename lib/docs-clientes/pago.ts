import type { SupabaseClient } from "@supabase/supabase-js";
import { getPreferenceClient } from "@/lib/mercadopago";
import { sitio, registrarEvento, type DatosReserva, type DocEmitido } from "@/lib/docs-clientes/core";

/** ¿Se puede cobrar esta reserva por Mercado Pago? (MP solo cobra en pesos). */
export function admitePagoMp(doc: DocEmitido) {
  return doc.tipo === "reserva" && (doc.datos as DatosReserva).monedaReserva === "ARS" && (doc.datos as DatosReserva).importeReserva > 0;
}

/**
 * Crea (o devuelve) el link de pago de Mercado Pago por el importe de la reserva.
 * external_reference = "docres:<id>" para que el webhook la marque como abonada.
 */
export async function asegurarLinkPagoReserva(a: SupabaseClient, doc: DocEmitido, actor: string | null): Promise<string | null> {
  if (doc.pagoLink) return doc.pagoLink;
  if (!admitePagoMp(doc) || doc.pagoEstado === "abonado") return null;
  const preference = getPreferenceClient();
  if (!preference) return null;
  const r = doc.datos as DatosReserva;
  const volver = `${sitio()}/pago-reserva/${doc.codigoVerificacion}`;
  try {
    const res = await preference.create({
      body: {
        items: [
          {
            id: doc.id,
            title: `Reserva ${doc.numero} – ${r.inmueble}`.slice(0, 250),
            quantity: 1,
            unit_price: Math.round(r.importeReserva * 100) / 100,
            currency_id: "ARS",
          },
        ],
        payer: doc.clienteEmail ? { name: doc.clienteNombre, email: doc.clienteEmail } : { name: doc.clienteNombre },
        back_urls: { success: volver, failure: volver, pending: volver },
        auto_return: "approved",
        external_reference: `docres:${doc.id}`,
        notification_url: `${sitio()}/api/mercadopago/webhook`,
        statement_descriptor: "DE NUNZIO INMOB",
      },
    });
    const link = res.init_point ?? null;
    if (link) {
      await a.from("doc_emitidos").update({ pago_link: link, pago_estado: doc.pagoEstado ?? "pendiente" }).eq("id", doc.id);
      await registrarEvento(a, doc.id, "pago_link_creado", {}, actor);
    }
    return link;
  } catch (err) {
    console.error("No se pudo crear el link de pago de la reserva", err);
    await registrarEvento(a, doc.id, "pago_link_error", { error: String(err).slice(0, 300) }, actor);
    return null;
  }
}

/** URL de la imagen QR del link de pago (sirve para mails y para la página). */
export const urlQrPago = (doc: Pick<DocEmitido, "codigoVerificacion">) => `${sitio()}/api/pago-reserva/${doc.codigoVerificacion}/qr`;
