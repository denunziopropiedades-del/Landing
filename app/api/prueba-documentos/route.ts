import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { BUCKET, crearLink, mapDoc, nuevoCodigoVerificacion, sha256 } from "@/lib/docs-clientes/core";
import { generarPdfDocumento } from "@/lib/docs-clientes/pdf";

export const runtime = "nodejs";

/** SOLO PREVIEW: emite un documento de prueba para probar el circuito. No existe en producción. */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") return new NextResponse("No", { status: 404 });
  const a = await getSupabaseAdminClient();
  if (!a) return NextResponse.json({ error: "sin db" });
  const emitidoEn = new Date().toISOString();
  const codigo = nuevoCodigoVerificacion();
  const base = {
    tipo: "reserva",
    numero: `PRUEBA-${Date.now()}`,
    codigo_verificacion: codigo,
    cliente_nombre: "Juan Pérez (PRUEBA)",
    cliente_email: "denunziopropiedades@gmail.com",
    cliente_telefono: "1127424512",
    cliente_dni: "30.123.456",
    datos: {
      inmueble: "Lote 12 – Manzana 4, Las Liebres - San Vicente",
      valorVenta: 12000,
      monedaVenta: "USD",
      importeReserva: 500,
      monedaReserva: "USD",
      formaPagoSaldo: "Anticipo USD 900 y 24 cuotas de USD 390",
      condiciones:
        "El importe de la reserva se imputará íntegramente a cuenta del precio de la operación al momento de concretarse la compraventa.\n\nLa reserva asegura la disponibilidad del inmueble a favor del cliente durante el plazo de validez indicado.",
    },
    acepta_habilitada: true,
    vence_en: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    emitido_en: emitidoEn,
    emitido_por_email: "prueba",
  };
  const borrador = mapDoc({ ...base, id: "", version: 1, estado: "emitido" });
  const pdf = await generarPdfDocumento(borrador);
  const path = `prueba/${base.numero}.pdf`;
  const up = await a.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
  if (up.error) return NextResponse.json({ error: up.error.message });
  const { data, error } = await a.from("doc_emitidos").insert({ ...base, pdf_path: path, pdf_sha256: sha256(pdf) }).select("id").single();
  if (error) return NextResponse.json({ error: error.message });
  const link = await crearLink(a, data.id, { canal: "copia", dias: 1, actor: "prueba" });
  const token = link.url.split("/").pop();
  return NextResponse.json({ ok: true, id: data.id, bytes: pdf.length, codigo, portal: `/cliente/documentos/${token}`, pdf: `/api/cliente/documentos/${token}/pdf` });
}
