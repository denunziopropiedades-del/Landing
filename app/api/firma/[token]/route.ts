import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { registrarActividadSistema } from "@/lib/admin/activity";
import { sendNotificationEmail } from "@/lib/email";
import {
  agendarFirmaEscribania,
  MAX_INTENTOS_DNI,
  resolverLinkFirma,
  soloDigitos,
  turnosDisponiblesFirma,
} from "@/lib/firma-escribania";

export const dynamic = "force-dynamic";

const WHATSAPP = "11-2742-4512";

/**
 * Link de firma en escribanía.
 * - { accion: "validar", dni }               → turnos disponibles
 * - { accion: "elegir", dni, fecha, horario } → agenda la firma
 */
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = await getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });

  const lead = await resolverLinkFirma(admin, token);
  if (!lead) {
    return NextResponse.json({ error: `Este link venció o ya no es válido. Pedí uno nuevo por WhatsApp al ${WHATSAPP}.` }, { status: 404 });
  }
  if (lead.intentos >= MAX_INTENTOS_DNI) {
    return NextResponse.json(
      { error: `Por seguridad el link quedó bloqueado por demasiados intentos. Escribinos por WhatsApp al ${WHATSAPP}.` },
      { status: 429 }
    );
  }

  const body = (await req.json().catch(() => ({}))) as { accion?: string; dni?: string; fecha?: string; horario?: string };
  const dni = soloDigitos(body.dni);
  if (!dni || dni !== soloDigitos(lead.dni)) {
    await admin.from("leads").update({ firma_link_intentos: lead.intentos + 1 }).eq("id", lead.id);
    const quedan = MAX_INTENTOS_DNI - lead.intentos - 1;
    return NextResponse.json(
      { error: quedan > 0 ? `El DNI no coincide con la reserva. Te quedan ${quedan} intento${quedan === 1 ? "" : "s"}.` : `El DNI no coincide. El link quedó bloqueado: escribinos por WhatsApp al ${WHATSAPP}.` },
      { status: 403 }
    );
  }
  if (lead.intentos > 0) await admin.from("leads").update({ firma_link_intentos: 0 }).eq("id", lead.id);

  const turnos = await turnosDisponiblesFirma(admin, lead);

  if (body.accion !== "elegir") {
    return NextResponse.json({
      nombre: lead.nombre,
      proyecto: lead.proyecto,
      actual: lead.fechaFirma && lead.horarioFirma ? { fecha: lead.fechaFirma, horario: lead.horarioFirma } : null,
      turnos,
    });
  }

  const fecha = String(body.fecha ?? "");
  const horario = String(body.horario ?? "");
  if (!turnos.some((t) => t.fecha === fecha && t.horarios.includes(horario))) {
    return NextResponse.json({ error: "Ese turno ya no está disponible. Elegí otro.", turnos }, { status: 409 });
  }

  const r = await agendarFirmaEscribania(admin, lead.id, fecha, horario);
  await admin.from("leads").update({ firma_elegida_en: new Date().toISOString() }).eq("id", lead.id);
  await registrarActividadSistema("actualizar", "lead", lead.id, {
    ...(r.manzana ? { manzana: r.manzana } : {}),
    ...(r.numerosLote.length > 0 ? { lote: r.numerosLote.join(", ") } : {}),
    fechaFirmaEscribania: fecha,
    horarioFirmaEscribania: horario,
    elegidoPor: "cliente (link con DNI)",
  });

  try {
    const [a, m, d] = fecha.split("-");
    await sendNotificationEmail(
      `✍️ ${r.nombre} eligió su firma en escribanía: ${d}/${m}/${a} ${horario} hs`,
      `<p><b>${r.nombre}</b>${lead.proyecto ? ` (${lead.proyecto})` : ""} eligió desde su link el <b>${d}/${m}/${a} a las ${horario} hs</b> para firmar en escribanía.</p>
       <p>Ya quedó cargado en su tarjeta del CRM y en la agenda.</p>
       ${r.aviso ? `<p style="color:#b45309;white-space:pre-line"><b>Atención:</b> ${r.aviso}</p>` : ""}`
    );
  } catch (err) {
    console.error("No se pudo avisar la elección de firma", err);
  }

  return NextResponse.json({ ok: true, fecha, horario });
}
