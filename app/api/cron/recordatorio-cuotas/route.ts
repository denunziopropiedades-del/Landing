import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { armarMailRecordatorioCuota, sendEmail } from "@/lib/email";
import { hoyEnArgentina } from "@/lib/fecha";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const autorizado =
    !process.env.CRON_SECRET ||
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    searchParams.get("secret") === process.env.CRON_SECRET;

  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = await getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, motivo: "Supabase no configurado" });
  }

  const hoy = hoyEnArgentina();
  const fechaObjetivo = new Date(Date.UTC(hoy.anio, hoy.mes, hoy.dia + 7)).toISOString().slice(0, 10);

  const { data: cuotas, error } = await supabase
    .from("cuotas")
    .select("id, numero, monto_usd, vencimiento, leads(nombre, email, plan_financiacion, proyectos(nombre))")
    .eq("pagada", false)
    .eq("vencimiento", fechaObjetivo)
    .is("recordatorio_enviado_en", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;

  for (const cuota of cuotas ?? []) {
    const lead = cuota.leads as unknown as {
      nombre: string;
      email: string;
      plan_financiacion: { cuotas: number } | null;
      proyectos: { nombre: string } | null;
    } | null;
    if (!lead?.email) continue;

    try {
      await sendEmail(
        lead.email,
        `Tu cuota está por vencer — ${lead.proyectos?.nombre ?? ""}`,
        armarMailRecordatorioCuota({
          nombre: lead.nombre,
          proyectoNombre: lead.proyectos?.nombre ?? "",
          numeroCuota: cuota.numero,
          totalCuotas: lead.plan_financiacion?.cuotas ?? cuota.numero,
          montoUsd: Number(cuota.monto_usd),
          vencimiento: cuota.vencimiento,
        })
      );
      await supabase.from("cuotas").update({ recordatorio_enviado_en: new Date().toISOString() }).eq("id", cuota.id);
      enviados += 1;
    } catch (err) {
      console.error("No se pudo enviar el recordatorio de cuota", cuota.id, err);
    }
  }

  return NextResponse.json({ ok: true, enviados });
}
