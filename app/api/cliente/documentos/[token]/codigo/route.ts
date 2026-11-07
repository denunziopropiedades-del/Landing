import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { enmascararEmail, estadoEfectivo, hashOtp, nuevoOtp, registrarEvento, resolverToken } from "@/lib/docs-clientes/core";
import { mailCodigo } from "@/lib/docs-clientes/emails";

export const runtime = "nodejs";

/** Manda al email del cliente un código de un solo uso para aceptar o rechazar la reserva. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rate = await checkRateLimit(request, "doc-cliente-codigo", 5, 900);
  if (!rate.success) return NextResponse.json({ error: "Pediste demasiados códigos. Esperá unos minutos." }, { status: 429 });
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const acceso = await resolverToken(admin, token);
  if (!acceso.ok) return NextResponse.json({ error: "El enlace no es válido o venció." }, { status: 404 });
  const { doc } = acceso;
  const estado = estadoEfectivo(doc);
  if (doc.tipo !== "reserva" || !doc.aceptaHabilitada || (estado !== "emitido" && estado !== "enviado")) {
    return NextResponse.json({ error: "Esta reserva ya no admite aceptación o rechazo online." }, { status: 409 });
  }
  if (!doc.clienteEmail) return NextResponse.json({ error: "No hay un email registrado para enviarte el código." }, { status: 409 });

  const desde = new Date(Date.now() - 15 * 60_000).toISOString();
  const { count } = await admin.from("doc_otp").select("id", { count: "exact", head: true }).eq("documento_id", doc.id).gte("creado_en", desde);
  if ((count ?? 0) >= 3) return NextResponse.json({ error: "Ya enviamos varios códigos. Revisá tu correo o esperá 15 minutos." }, { status: 429 });

  const codigo = nuevoOtp();
  await admin.from("doc_otp").insert({
    documento_id: doc.id,
    link_id: acceso.linkId,
    codigo_hash: hashOtp(doc.id, codigo),
    enviado_a: doc.clienteEmail,
    vence_en: new Date(Date.now() + 10 * 60_000).toISOString(),
  });
  try {
    const m = mailCodigo(doc, codigo);
    const r = await sendEmail(doc.clienteEmail, m.asunto, m.html);
    if ("skipped" in r && r.skipped) throw new Error("mail no configurado");
  } catch (err) {
    await registrarEvento(admin, doc.id, "codigo_error", { error: String(err).slice(0, 300) }, "cliente");
    return NextResponse.json({ error: "No pudimos enviarte el código. Escribinos por WhatsApp." }, { status: 502 });
  }
  await registrarEvento(admin, doc.id, "codigo_enviado", { a: enmascararEmail(doc.clienteEmail) }, "cliente");
  return NextResponse.json({ ok: true, enviadoA: enmascararEmail(doc.clienteEmail) });
}
