import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { armarMailRecordatorioCuota, sendEmail } from "@/lib/email";
import { hoyEnArgentina } from "@/lib/fecha";
import { linkMisCuotas } from "@/lib/mis-cuotas";

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

  const hoyIso = new Date(Date.UTC(hoy.anio, hoy.mes, hoy.dia)).toISOString().slice(0, 10);
  // Una semana antes del vencimiento. Si algún día el aviso no salió (cron caído, cuota
  // generada tarde), se manda igual mientras la cuota no haya vencido.
  const { data: cuotas, error } = await supabase
    .from("cuotas")
    .select("id, lead_id, numero, monto_usd, vencimiento, leads(nombre, email, plan_financiacion, portal_token, proyectos(nombre))")
    .eq("pagada", false)
    .gte("vencimiento", hoyIso)
    .lte("vencimiento", fechaObjetivo)
    .is("recordatorio_enviado_en", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let enviados = 0;
  const leadIds = [...new Set((cuotas ?? []).map((c) => c.lead_id as string))];
  const pagadasPorLead = new Map<string, number>();
  if (leadIds.length) {
    const { data: pagas } = await supabase.from("cuotas").select("lead_id").eq("pagada", true).in("lead_id", leadIds);
    for (const p of pagas ?? []) pagadasPorLead.set(p.lead_id as string, (pagadasPorLead.get(p.lead_id as string) ?? 0) + 1);
  }

  for (const cuota of cuotas ?? []) {
    const lead = cuota.leads as unknown as {
      nombre: string;
      email: string;
      plan_financiacion: { cuotas: number; moneda?: string } | null;
      portal_token: string | null;
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
          moneda: lead.plan_financiacion?.moneda,
          vencimiento: cuota.vencimiento,
          pagadas: pagadasPorLead.get(cuota.lead_id as string) ?? 0,
          diasParaVencer: Math.round((Date.parse(`${cuota.vencimiento}T12:00:00Z`) - Date.parse(`${hoyIso}T12:00:00Z`)) / 86400000),
          linkPortal: linkMisCuotas(lead.portal_token),
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
