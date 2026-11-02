import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail, sendNotificationEmail } from "@/lib/email";
import { asegurarCuotas } from "@/lib/alquileres-server";
import { fechaCorta, formatoMonto, hoyIso, mapContrato, mapCuota, mapPersona, nombrePeriodo, totalCuota } from "@/lib/alquileres";

export const runtime = "nodejs";

const sumarDias = (iso: string, d: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + d * 86400000).toISOString().slice(0, 10);

/**
 * Todos los días: genera los meses que falten, le recuerda al inquilino 3 días antes del vencimiento
 * y te avisa los contratos que vencen en 60 días y los ajustes de la semana.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const autorizado =
    !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}` || searchParams.get("secret") === process.env.CRON_SECRET;
  if (!autorizado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const admin = await getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: true, motivo: "Supabase no configurado" });

  const { data: cs, error } = await admin.from("alq_contratos").select("*").eq("estado", "activo");
  if (error) return NextResponse.json({ ok: true, motivo: "Tablas de alquileres sin crear" });
  const contratos = (cs ?? []).map(mapContrato);
  const generadas = await asegurarCuotas(admin, contratos);

  const hoy = hoyIso();
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
  const { data: personasRaw } = await admin.from("alq_personas").select("*");
  const persona = new Map((personasRaw ?? []).map((p) => [p.id as string, mapPersona(p)]));
  const contrato = new Map(contratos.map((c) => [c.id, c]));

  // Recordatorio al inquilino 3 días antes.
  const en3 = sumarDias(hoy, 3);
  const { data: proximas } = await admin.from("alq_cuotas").select("*").eq("vencimiento", en3).is("pagado_en", null);
  let recordatorios = 0;
  for (const q of (proximas ?? []).map(mapCuota)) {
    const c = contrato.get(q.contratoId);
    const inq = c ? persona.get(c.inquilinoId) : undefined;
    if (!c || !inq?.email) continue;
    try {
      await sendEmail(
        inq.email,
        `Recordatorio: el alquiler de ${nombrePeriodo(q.periodo)} vence el ${fechaCorta(q.vencimiento)}`,
        `<p>Hola ${inq.nombre}, te recordamos que el alquiler de <b>${nombrePeriodo(q.periodo)}</b> de ${c.direccion} vence el <b>${fechaCorta(q.vencimiento)}</b>.</p>
         <p>Total: <b>${formatoMonto(totalCuota(q, c, hoy), c.moneda)}</b>.</p>
         <p><a href="${site}/mi-alquiler/${inq.token}">Ver mi cuenta y pagar</a></p>`
      );
      recordatorios++;
    } catch (err) {
      console.error("No se pudo enviar el recordatorio de alquiler", err);
    }
  }

  // Avisos para la inmobiliaria.
  const en60 = sumarDias(hoy, 60);
  const en7 = sumarDias(hoy, 7);
  const vencen = contratos.filter((c) => c.fechaFin === en60);
  const ajustes = contratos.filter((c) => c.proximoAjuste === en7);
  if (vencen.length || ajustes.length) {
    const li = (c: (typeof contratos)[number], txt: string) => `<li><b>${c.direccion}</b> (${persona.get(c.inquilinoId)?.nombre ?? ""}): ${txt}</li>`;
    try {
      await sendNotificationEmail(
        "Alquileres: vencimientos y ajustes próximos",
        `${vencen.length ? `<p>Contratos que vencen en 60 días:</p><ul>${vencen.map((c) => li(c, `vence el ${fechaCorta(c.fechaFin)}`)).join("")}</ul>` : ""}
         ${ajustes.length ? `<p>Ajustes de la semana que viene:</p><ul>${ajustes.map((c) => li(c, `ajuste el ${fechaCorta(c.proximoAjuste)} · hoy ${formatoMonto(c.montoActual, c.moneda)}`)).join("")}</ul>` : ""}
         <p><a href="${site}/admin/alquileres">Ir a Administración de alquileres</a></p>`
      );
    } catch (err) {
      console.error("No se pudo enviar el aviso de alquileres", err);
    }
  }

  return NextResponse.json({ ok: true, generadas, recordatorios, vencen: vencen.length, ajustes: ajustes.length });
}
