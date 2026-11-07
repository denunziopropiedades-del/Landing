import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { BUCKET, PREFIJO, hoyAr, mapDoc, nuevoCodigoVerificacion, registrarEvento, sha256, type DatosReserva } from "@/lib/docs-clientes/core";
import { generarPdfDocumento } from "@/lib/docs-clientes/pdf";
import { asegurarLinkPagoReserva } from "@/lib/docs-clientes/pago";

export const runtime = "nodejs";

const CONDICIONES = `El importe de la reserva se imputará íntegramente a cuenta del precio de la operación al momento de concretarse la compraventa.

La reserva asegura la disponibilidad del inmueble a favor del cliente durante el plazo de validez indicado. Vencido dicho plazo sin que se haya formalizado la operación, la reserva quedará sin efecto.

El importe abonado en concepto de reserva, denominada seña, no será devuelto en caso de cancelación o anulación de la operación, ni cuando no se concrete el acuerdo previamente pactado.

Los honorarios profesionales del corredor interviniente son los indicados en este documento y se calculan sobre el monto total de la operación. La operación es gestionada por la inmobiliaria; los gastos e impuestos que correspondan a cada parte se informarán al momento de la firma del boleto o escritura.`;

/** TEMPORAL, solo preview: anula RES-2026-000001 y emite su reemplazo con honorarios y condiciones nuevas. */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") return new NextResponse("No", { status: 404 });
  const a = await getSupabaseAdminClient();
  if (!a) return NextResponse.json({ error: "sin db" });
  const { data: viejo } = await a.from("doc_emitidos").select("*").eq("numero", "RES-2026-000001").maybeSingle();
  if (!viejo) return NextResponse.json({ error: "no existe" });
  if (viejo.estado === "anulado") return NextResponse.json({ error: "ya estaba anulada" });
  const v = mapDoc(viejo);

  const anio = Number(hoyAr().slice(0, 4));
  const { data: nro, error: eNro } = await a.rpc("doc_siguiente_numero", { p_tipo: "reserva", p_anio: anio });
  if (eNro) return NextResponse.json({ error: eNro.message });
  const numero = `${PREFIJO.reserva}-${anio}-${String(nro).padStart(6, "0")}`;
  const datos: DatosReserva = { ...(v.datos as DatosReserva), honorariosPct: 3, condiciones: CONDICIONES };
  const emitidoEn = new Date().toISOString();
  const codigo = nuevoCodigoVerificacion();
  const borrador = mapDoc({ ...viejo, id: "", numero, codigo_verificacion: codigo, estado: "emitido", datos, emitido_en: emitidoEn, pago_estado: "pendiente", pago_link: null, anulado_en: null, anulado_motivo: null });
  const pdf = await generarPdfDocumento(borrador);
  const path = `reserva/${numero}.pdf`;
  const up = await a.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) return NextResponse.json({ error: up.error.message });
  const { data: nuevo, error } = await a
    .from("doc_emitidos")
    .insert({
      tipo: "reserva",
      numero,
      codigo_verificacion: codigo,
      estado: "emitido",
      lead_id: v.leadId,
      cliente_nombre: v.clienteNombre,
      cliente_email: v.clienteEmail,
      cliente_telefono: v.clienteTelefono,
      cliente_dni: v.clienteDni,
      datos,
      acepta_habilitada: v.aceptaHabilitada,
      vence_en: v.venceEn,
      pago_estado: "pendiente",
      pdf_path: path,
      pdf_sha256: sha256(pdf),
      emitido_en: emitidoEn,
      emitido_por_email: v.emitidoPorEmail,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message });
  await registrarEvento(a, nuevo.id, "emitido", { numero, reemplazaA: v.numero }, v.emitidoPorEmail);

  const ahora = new Date().toISOString();
  await a.from("doc_emitidos").update({ estado: "anulado", anulado_en: ahora, anulado_motivo: `Reemplazada por ${numero} (se agregan honorarios y cláusula de seña)` }).eq("id", v.id);
  await a.from("doc_links").update({ revocado_en: ahora }).eq("documento_id", v.id).is("revocado_en", null);
  await registrarEvento(a, v.id, "anulado", { motivo: `Reemplazada por ${numero}` }, v.emitidoPorEmail);

  const link = await asegurarLinkPagoReserva(a, mapDoc(nuevo), v.emitidoPorEmail);
  return NextResponse.json({ ok: true, numero, bytes: pdf.length, linkPago: !!link });
}
