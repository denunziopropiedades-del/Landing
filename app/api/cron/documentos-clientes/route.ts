import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail, sendNotificationEmail } from "@/lib/email";
import { crearLink, hoyAr, mapDoc, registrarEvento, yaOcurrio } from "@/lib/docs-clientes/core";
import { mailAvisoInterno, mailReservaPorVencer } from "@/lib/docs-clientes/emails";

export const runtime = "nodejs";

const sumarDias = (iso: string, d: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86400000).toISOString().slice(0, 10);

/** Todos los días: avisa las reservas que vencen en 2 días y marca como vencidas las que pasaron su plazo. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const autorizado =
    !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}` || searchParams.get("secret") === process.env.CRON_SECRET;
  if (!autorizado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = await getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: true, motivo: "Supabase no configurado" });
  const hoy = hoyAr();

  const { data: pendientes, error } = await admin
    .from("doc_emitidos")
    .select("*")
    .eq("tipo", "reserva")
    .in("estado", ["emitido", "enviado"])
    .not("vence_en", "is", null)
    .lte("vence_en", sumarDias(hoy, 2));
  if (error) return NextResponse.json({ ok: true, motivo: "Tablas de documentos sin crear" });

  let avisos = 0;
  let vencidas = 0;
  for (const raw of pendientes ?? []) {
    const doc = mapDoc(raw);
    if (doc.venceEn! < hoy) {
      await admin.from("doc_emitidos").update({ estado: "vencido" }).eq("id", doc.id).in("estado", ["emitido", "enviado"]);
      if (!(await yaOcurrio(admin, doc.id, "vencida"))) {
        await registrarEvento(admin, doc.id, "vencida", {}, "sistema");
        try {
          const m = mailAvisoInterno("Reserva vencida sin respuesta", doc);
          await sendNotificationEmail(m.asunto, m.html);
        } catch (err) {
          console.error(err);
        }
      }
      vencidas++;
      continue;
    }
    if (await yaOcurrio(admin, doc.id, "aviso_por_vencer")) continue;
    try {
      const link = doc.clienteEmail ? await crearLink(admin, doc.id, { canal: "recordatorio", dias: 7, actor: "sistema" }) : null;
      if (doc.clienteEmail && link) {
        const c = mailReservaPorVencer(doc, link.url);
        await sendEmail(doc.clienteEmail, c.asunto, c.html);
      }
      const m = mailAvisoInterno("Reserva por vencer", doc, `<p>Vence el ${doc.venceEn}.</p>`);
      await sendNotificationEmail(m.asunto, m.html);
      await registrarEvento(admin, doc.id, "aviso_por_vencer", { a: doc.clienteEmail }, "sistema");
      avisos++;
    } catch (err) {
      console.error("No se pudo avisar la reserva por vencer", doc.numero, err);
    }
  }
  return NextResponse.json({ ok: true, avisos, vencidas });
}
