import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatosReserva, DocEmitido } from "@/lib/docs-clientes/compartido";

/** Etapas del CRM anteriores al pago: al pagarse la seña la tarjeta pasa a "Pago confirmado". */
const ESTADOS_ANTERIORES_A_PAGO = ["nuevo", "contactado", "visita_programada", "visita_realizada", "reservado"];

/**
 * Vuelca el pago de la seña de una reserva en la ficha del CRM vinculada:
 * monto, número de operación, medio y fecha. Así la tarjeta muestra la seña
 * apenas se cobra (Mercado Pago o marcada a mano) y el cliente pasa a Cobranzas.
 */
export async function volcarSenaEnLead(
  a: SupabaseClient,
  doc: DocEmitido,
  pago: { importe: number | null; medio: "mercadopago" | "transferencia" | "efectivo"; numeroOperacion: string | null; mpId?: string | null }
): Promise<boolean> {
  if (!doc.leadId) return false;
  const { data: lead } = await a.from("leads").select("estado").eq("id", doc.leadId).maybeSingle();
  if (!lead) return false;
  const r = doc.datos as DatosReserva;
  const ahora = new Date().toISOString();
  // La ficha guarda la seña en pesos: si la reserva es en dólares, el número de operación lleva el monto.
  const enPesos = r.monedaReserva === "ARS";
  const numero = pago.numeroOperacion?.trim() || doc.numero;
  const { error } = await a
    .from("leads")
    .update({
      importe_cobrado: enPesos ? pago.importe : null,
      numero_transaccion: enPesos ? numero : `${numero} · USD ${pago.importe ?? r.importeReserva}`,
      medio_pago_sena: pago.medio,
      pago_confirmado_en: ahora,
      ...(pago.mpId ? { pago_mercadopago_id: pago.mpId } : {}),
      ...(ESTADOS_ANTERIORES_A_PAGO.includes(lead.estado as string) ? { estado: "pago_confirmado" } : {}),
      actualizado_en: ahora,
    })
    .eq("id", doc.leadId);
  if (error) {
    console.error("No se pudo volcar la seña en el CRM", error);
    return false;
  }
  return true;
}

/** Si se vuelve el pago a pendiente, limpia la seña de la ficha (solo si es la que cargó esta reserva). */
export async function quitarSenaDeLead(a: SupabaseClient, doc: DocEmitido, numeroCargado: string | null) {
  if (!doc.leadId) return;
  const { data: lead } = await a.from("leads").select("numero_transaccion").eq("id", doc.leadId).maybeSingle();
  if (!lead) return;
  const n = (lead.numero_transaccion as string | null) ?? "";
  if (n !== (numeroCargado ?? "") && n !== doc.numero && !n.startsWith(`${doc.numero} ·`)) return;
  await a
    .from("leads")
    .update({ importe_cobrado: null, numero_transaccion: null, medio_pago_sena: null, pago_confirmado_en: null, actualizado_en: new Date().toISOString() })
    .eq("id", doc.leadId);
}
