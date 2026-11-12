import type { SupabaseClient } from "@supabase/supabase-js";
import type { DatosReserva, DocEmitido } from "@/lib/docs-clientes/compartido";
import { guardarLeadUnificado } from "@/lib/leads";

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
  // Reserva hecha a alguien que todavía no estaba en el CRM: se le crea la ficha.
  if (!doc.leadId) {
    const id = await asegurarLeadDeReserva(a, doc, "pagada");
    if (!id) return false;
    doc = { ...doc, leadId: id };
  }
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

/** Etapas en las que una ficha todavía no llegó a "Reservado". */
const ESTADOS_ANTERIORES_A_RESERVA = ["nuevo", "contactado", "visita_programada", "visita_realizada", "descartado"];

const fechaHoraAr = () =>
  new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());

const montoTxt = (v: number | null | undefined, moneda: "USD" | "ARS") =>
  v == null ? "" : moneda === "USD" ? `USD ${v.toLocaleString("es-AR")}` : `$ ${v.toLocaleString("es-AR")}`;

/**
 * Cuando el cliente acepta (o paga) una reserva, se asegura de que tenga su ficha en el CRM
 * en la etapa "Reservado", para seguirlo como cliente nuevo:
 * - si la reserva ya estaba vinculada a una ficha, la avanza a "Reservado" (si estaba antes);
 * - si no, busca una ficha abierta con el mismo email o teléfono y la usa;
 * - si no hay ninguna, crea la ficha con los datos de la reserva.
 * Deja la reserva vinculada a esa ficha (así la seña, Cobranzas y los pagarés quedan sincronizados).
 * Devuelve el id de la ficha, o null si no se pudo.
 */
export async function asegurarLeadDeReserva(a: SupabaseClient, doc: DocEmitido, motivo: "aceptada" | "pagada"): Promise<string | null> {
  const r = doc.datos as DatosReserva;
  const nota = [
    `✅ Reserva ${doc.numero} ${motivo === "aceptada" ? "ACEPTADA online por el cliente" : "PAGADA"} el ${fechaHoraAr()}.`,
    `Inmueble: ${r.inmueble}`,
    r.valorVenta ? `Valor de venta: ${montoTxt(r.valorVenta, r.monedaVenta)}` : null,
    `Reserva: ${montoTxt(r.importeReserva, r.monedaReserva)}`,
    r.formaPagoSaldo ? `Forma de pago del saldo: ${r.formaPagoSaldo}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    let leadId = doc.leadId;

    // Ficha abierta con el mismo email (el teléfono lo resuelve guardarLeadUnificado).
    if (!leadId && doc.clienteEmail) {
      const { data: porMail } = await a
        .from("leads")
        .select("id, estado")
        .ilike("email", doc.clienteEmail.trim().replace(/[%_\\]/g, "\\$&"))
        .neq("estado", "vendido")
        .order("actualizado_en", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (porMail) leadId = porMail.id as string;
    }

    if (leadId) {
      const { data: lead } = await a.from("leads").select("id, estado, observaciones, dni, telefono").eq("id", leadId).maybeSingle();
      if (!lead) return null;
      const cambios: Record<string, unknown> = {
        observaciones: [lead.observaciones, nota].filter(Boolean).join("\n\n"),
        actualizado_en: new Date().toISOString(),
      };
      if (ESTADOS_ANTERIORES_A_RESERVA.includes(lead.estado as string)) cambios.estado = "reservado";
      if (!lead.dni && doc.clienteDni) cambios.dni = doc.clienteDni;
      if (!lead.telefono && doc.clienteTelefono) cambios.telefono = doc.clienteTelefono;
      await a.from("leads").update(cambios).eq("id", leadId);
    } else {
      const [nombre, ...resto] = doc.clienteNombre.trim().split(/\s+/);
      const res = await guardarLeadUnificado(a, {
        tipo: "manual",
        nombre: nombre || doc.clienteNombre,
        apellido: resto.join(" ") || null,
        dni: doc.clienteDni,
        email: doc.clienteEmail ?? "",
        telefono: doc.clienteTelefono ?? "",
        mensaje: `Reserva ${doc.numero} — ${r.inmueble}`,
        observaciones: nota,
        estado: "reservado",
      });
      if (!res.id) {
        console.error("No se pudo crear la ficha del CRM para la reserva", doc.numero, res.error);
        return null;
      }
      leadId = res.id;
    }

    if (leadId !== doc.leadId) await a.from("doc_emitidos").update({ lead_id: leadId }).eq("id", doc.id);
    return leadId;
  } catch (err) {
    console.error("No se pudo vincular la reserva con el CRM", doc.numero, err);
    return null;
  }
}
