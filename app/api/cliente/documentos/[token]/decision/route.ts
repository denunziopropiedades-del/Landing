import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { sendEmail, sendNotificationEmail } from "@/lib/email";
import { estadoEfectivo, otpCoincide, registrarEvento, resolverToken, sitio, textoConsentimiento } from "@/lib/docs-clientes/core";
import { mailAvisoInterno, mailConstancia } from "@/lib/docs-clientes/emails";
import { asegurarLeadDeReserva, volcarSenaEnLead } from "@/lib/docs-clientes/sena-lead";

export const runtime = "nodejs";

/** El cliente acepta o rechaza la reserva, validando el código que le llegó por mail. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const rate = await checkRateLimit(request, "doc-cliente-decision", 10, 900);
  if (!rate.success) return NextResponse.json({ error: "Demasiados intentos. Esperá unos minutos." }, { status: 429 });
  const { token } = await params;
  const body = (await request.json().catch(() => null)) as { codigo?: string; decision?: string; consentimiento?: boolean; motivo?: string } | null;
  const decision = body?.decision === "aceptado" ? "aceptado" : body?.decision === "rechazado" ? "rechazado" : null;
  const codigo = String(body?.codigo ?? "").replace(/\D/g, "");
  if (!decision) return NextResponse.json({ error: "Elegí aceptar o rechazar." }, { status: 400 });
  if (!body?.consentimiento) return NextResponse.json({ error: "Tenés que marcar la casilla de confirmación." }, { status: 400 });
  if (codigo.length !== 6) return NextResponse.json({ error: "Ingresá el código de 6 dígitos que te llegó por mail." }, { status: 400 });

  const admin = await getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "No disponible." }, { status: 503 });
  const acceso = await resolverToken(admin, token);
  if (!acceso.ok) return NextResponse.json({ error: "El enlace no es válido o venció." }, { status: 404 });
  const { doc } = acceso;
  const estado = estadoEfectivo(doc);
  if (doc.tipo !== "reserva" || !doc.aceptaHabilitada || (estado !== "emitido" && estado !== "enviado")) {
    return NextResponse.json({ error: "Esta reserva ya no admite aceptación o rechazo online." }, { status: 409 });
  }

  const { data: otp } = await admin
    .from("doc_otp")
    .select("*")
    .eq("documento_id", doc.id)
    .is("usado_en", null)
    .gt("vence_en", new Date().toISOString())
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!otp) return NextResponse.json({ error: "El código venció o no existe. Pedí uno nuevo." }, { status: 400 });
  if (Number(otp.intentos) >= 5) return NextResponse.json({ error: "Demasiados intentos con ese código. Pedí uno nuevo." }, { status: 429 });
  if (!otpCoincide(doc.id, codigo, String(otp.codigo_hash))) {
    await admin.from("doc_otp").update({ intentos: Number(otp.intentos) + 1 }).eq("id", otp.id);
    await registrarEvento(admin, doc.id, "codigo_fallido", { intento: Number(otp.intentos) + 1 }, "cliente");
    return NextResponse.json({ error: "El código no es correcto." }, { status: 400 });
  }

  const ahora = new Date().toISOString();
  // Se marca el código como usado y se cambia el estado solo si seguía pendiente (evita dobles decisiones).
  const { data: usado } = await admin.from("doc_otp").update({ usado_en: ahora }).eq("id", otp.id).is("usado_en", null).select("id").maybeSingle();
  if (!usado) return NextResponse.json({ error: "Ese código ya se usó." }, { status: 409 });
  const { data: actualizado } = await admin
    .from("doc_emitidos")
    .update({ estado: decision })
    .eq("id", doc.id)
    .in("estado", ["emitido", "enviado"])
    .select("id")
    .maybeSingle();
  if (!actualizado) return NextResponse.json({ error: "La reserva ya tenía una decisión registrada." }, { status: 409 });

  const motivo = String(body?.motivo ?? "").trim().slice(0, 500) || null;
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || null;
  await admin.from("doc_decisiones").insert({
    documento_id: doc.id,
    decision,
    version: doc.version,
    pdf_sha256: doc.pdfSha256,
    email_verificado: otp.enviado_a,
    consentimiento: textoConsentimiento(doc.numero, doc.version, doc.pdfSha256, decision),
    motivo,
    ip,
    user_agent: (request.headers.get("user-agent") ?? "").slice(0, 300),
    creado_en: ahora,
  });
  await registrarEvento(admin, doc.id, decision === "aceptado" ? "cliente_acepto" : "cliente_rechazo", { motivo, ip }, "cliente");

  // Reserva aceptada: el cliente pasa al CRM como cliente nuevo en "Reservado" (se crea la ficha si no existía).
  let enCrm = false;
  if (decision === "aceptado") {
    const leadId = await asegurarLeadDeReserva(admin, doc, "aceptada");
    if (leadId) {
      enCrm = true;
      await registrarEvento(admin, doc.id, "cliente_en_crm", { leadId, nuevo: !doc.leadId }, "sistema");
      // Si la seña ya estaba pagada antes de aceptar, se vuelca también en la ficha.
      if (doc.pagoEstado === "abonado" && !doc.leadId) {
        await volcarSenaEnLead(admin, { ...doc, leadId }, {
          importe: doc.pagoMonto,
          medio: (["mercadopago", "transferencia", "efectivo"].includes(doc.pagoMedio ?? "") ? doc.pagoMedio : "transferencia") as "mercadopago" | "transferencia" | "efectivo",
          numeroOperacion: doc.pagoMpId ?? null,
        });
      }
    }
  }

  const link = `${sitio()}/cliente/documentos/${token}`;
  try {
    if (doc.clienteEmail) {
      const c = mailConstancia(doc, decision, { fecha: ahora, hash: doc.pdfSha256, motivo, link });
      await sendEmail(doc.clienteEmail, c.asunto, c.html);
      await registrarEvento(admin, doc.id, "constancia_enviada", { a: doc.clienteEmail }, "sistema");
    }
  } catch (err) {
    console.error("No se pudo enviar la constancia", err);
  }
  try {
    const m = mailAvisoInterno(
      decision === "aceptado" ? "✅ El cliente ACEPTÓ la reserva" : "❌ El cliente RECHAZÓ la reserva",
      doc,
      [
        motivo ? `<p><b>Motivo:</b> ${motivo.replace(/</g, "&lt;")}</p>` : "",
        enCrm ? `<p>📋 El cliente ${doc.leadId ? "pasó" : "se cargó"} en el CRM en la etapa <b>Reservado</b>: <a href="${sitio()}/admin/crm">abrir CRM</a>.</p>` : "",
      ].join("")
    );
    await sendNotificationEmail(m.asunto, m.html);
  } catch (err) {
    console.error("No se pudo avisar la decisión", err);
  }
  return NextResponse.json({ ok: true, decision, fecha: ahora });
}
