import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getPaymentClient, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail, sendNotificationEmail } from "@/lib/email";
import { generarComprobantePdf } from "@/lib/pdf-comprobante";
import { registrarActividadSistema } from "@/lib/admin/activity";

export const runtime = "nodejs";

const WEBHOOK_SECRET = process.env.MERCADOPAGO_WEBHOOK_SECRET;

// Estados en los que todavía tiene sentido avanzar automáticamente a "pago_confirmado"
// al confirmarse el pago; si el lead ya avanzó más allá (por ejemplo el equipo ya lo
// pasó a firma), no lo retrocedemos.
const ESTADOS_ANTERIORES_A_PAGO = ["nuevo", "contactado", "visita_programada", "visita_realizada", "reservado"];

function firmaValida(request: Request, dataId: string): boolean {
  if (!WEBHOOK_SECRET) return false;

  const firmaHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  if (!firmaHeader || !requestId) return false;

  const partes = Object.fromEntries(
    firmaHeader.split(",").map((par) => {
      const [clave, valor] = par.split("=");
      return [clave?.trim(), valor?.trim()];
    })
  );
  const ts = partes.ts;
  const v1 = partes.v1;
  if (!ts || !v1) return false;

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const esperada = crypto.createHmac("sha256", WEBHOOK_SECRET).update(manifest).digest("hex");

  const a = Buffer.from(esperada);
  const b = Buffer.from(v1);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!isMercadoPagoConfigured() || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Mercado Pago no está configurado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  let payload: { data?: { id?: string }; type?: string } = {};
  try {
    payload = await request.json();
  } catch {
    // Algunas notificaciones de MP llegan sin body, solo con query params.
  }

  const dataId = searchParams.get("data.id") ?? payload.data?.id;
  const tipo = searchParams.get("type") ?? payload.type;

  if (tipo !== "payment" || !dataId) {
    return NextResponse.json({ ok: true });
  }

  if (!firmaValida(request, dataId)) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const paymentClient = getPaymentClient();
  if (!paymentClient) return NextResponse.json({ ok: true });

  try {
    const payment = await paymentClient.get({ id: dataId });

    if (payment.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const leadId = payment.external_reference;
    if (!leadId) return NextResponse.json({ ok: true });

    const supabase = await getSupabaseAdminClient();
    if (!supabase) return NextResponse.json({ ok: true });

    const { data: lead } = await supabase
      .from("leads")
      .select(
        "nombre, apellido, dni, email, telefono, estado, manzana, pago_confirmado_en, proyectos(nombre), lead_lotes(lotes(numero, superficie_m2))"
      )
      .eq("id", leadId)
      .maybeSingle();

    if (!lead || lead.pago_confirmado_en) {
      // Ya procesado antes (Mercado Pago puede reenviar la misma notificación) o el lead no existe.
      return NextResponse.json({ ok: true });
    }

    const importe = payment.transaction_amount ?? 0;
    const ahora = new Date().toISOString();

    const nuevoEstado = ESTADOS_ANTERIORES_A_PAGO.includes(lead.estado) ? "pago_confirmado" : lead.estado;

    await supabase
      .from("leads")
      .update({
        pago_confirmado_en: ahora,
        pago_mercadopago_id: String(dataId),
        numero_transaccion: String(dataId),
        importe_cobrado: importe,
        estado: nuevoEstado,
        actualizado_en: ahora,
      })
      .eq("id", leadId);

    const lotes = ((lead.lead_lotes ?? []) as unknown as { lotes: { numero: string; superficie_m2: number } | null }[])
      .map((ll) => ll.lotes)
      .filter((l): l is { numero: string; superficie_m2: number } => l !== null)
      .map((l) => ({ numero: l.numero, superficieM2: l.superficie_m2 }));

    const proyectoNombre = (lead.proyectos as unknown as { nombre: string } | null)?.nombre ?? "";
    const nombreCompleto = `${lead.nombre} ${lead.apellido ?? ""}`.trim();

    await registrarActividadSistema("confirmar-pago", "lead", leadId, {
      ...(lead.manzana ? { manzana: lead.manzana } : {}),
      ...(lotes.length > 0 ? { lote: lotes.map((l) => l.numero).join(", ") } : {}),
      pagoId: String(dataId),
      importe,
    });

    try {
      const comprobante = await generarComprobantePdf({
        nombreCliente: nombreCompleto,
        dni: lead.dni ?? "",
        email: lead.email,
        telefono: lead.telefono,
        proyectoNombre,
        manzana: lead.manzana ?? "",
        lotes,
        importeArs: importe,
        pagoId: String(dataId),
        fecha: new Date(),
      });

      await sendEmail(
        lead.email,
        `Confirmamos tu pago — ${proyectoNombre}`,
        `<h2>¡Pago confirmado, ${lead.nombre}!</h2>
         <p style="color: #333;">Recibimos correctamente el pago de tu seña. Adjuntamos el comprobante.</p>
         <p style="margin: 16px 0 4px; color: #333;"><b>PROYECTO:</b> ${proyectoNombre}</p>
         <p style="margin: 0 0 4px; color: #333;"><b>MANZANA:</b> ${lead.manzana ?? ""}</p>
         <p style="margin: 0 0 4px; color: #333;"><b>LOTES:</b> ${lotes.map((l) => `Lote ${l.numero} (${l.superficieM2} m²)`).join(", ")}</p>
         <p style="margin: 0 0 4px; color: #333;"><b>Importe abonado:</b> $ ${importe.toLocaleString("es-AR")}</p>
         <p style="margin: 16px 0 4px; color: #333;">Nuestro equipo se va a comunicar para coordinar los próximos pasos de la operación.</p>`,
        [{ filename: "comprobante.pdf", content: comprobante.toString("base64") }]
      );
    } catch (err) {
      console.error("No se pudo generar/enviar el comprobante de pago", err);
    }

    try {
      await sendNotificationEmail(
        `Pago confirmado: ${nombreCompleto}`,
        `<h2>Pago de seña confirmado</h2>
         <ul>
           <li><b>Cliente:</b> ${nombreCompleto}</li>
           <li><b>Proyecto:</b> ${proyectoNombre}</li>
           <li><b>Importe:</b> $ ${importe.toLocaleString("es-AR")}</li>
           <li><b>ID de pago:</b> ${dataId}</li>
         </ul>`
      );
    } catch (err) {
      console.error("No se pudo enviar el email de notificación de pago", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error procesando webhook de Mercado Pago", err);
    return NextResponse.json({ ok: true });
  }
}
