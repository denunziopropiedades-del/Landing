import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapContrato, mapCuota, nombrePeriodo, totalCuota } from "@/lib/alquileres";
import { crearLinkPagoAlquiler, isMercadoPagoConfigured } from "@/lib/mercadopago";

export const runtime = "nodejs";

/** El inquilino toca "Pagar con Mercado Pago" en su link: se arma el pago por el total a hoy y se lo redirige. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
  const volver = `${site}/mi-alquiler/${encodeURIComponent(token)}`;
  const admin = await getSupabaseAdminClient();
  if (!admin || !isMercadoPagoConfigured()) return NextResponse.redirect(`${volver}?pago=no-disponible`);

  const { data } = await admin
    .from("alq_cuotas")
    .select("*, alq_contratos(*, inquilino:alq_personas!alq_contratos_inquilino_id_fkey(*))")
    .eq("id", id)
    .maybeSingle();
  const c = data?.alq_contratos as (Record<string, unknown> & { inquilino: { token: string; nombre: string; email: string | null } }) | undefined;
  if (!data || !c || !token || c.inquilino?.token !== token) return new Response("No autorizado", { status: 401 });

  const cuota = mapCuota(data);
  const contrato = mapContrato(c);
  if (cuota.pagadoEn) return NextResponse.redirect(`${volver}?pago=ya-pagado`);
  if (contrato.moneda !== "ARS") return NextResponse.redirect(`${volver}?pago=no-disponible`);

  const url = await crearLinkPagoAlquiler({
    cuotaId: cuota.id,
    titulo: `Alquiler ${nombrePeriodo(cuota.periodo)} — ${contrato.direccion}`,
    monto: totalCuota(cuota, contrato),
    nombre: c.inquilino.nombre,
    email: c.inquilino.email,
    volverA: volver,
  });
  if (!url) return NextResponse.redirect(`${volver}?pago=error`);
  await admin.from("alq_cuotas").update({ mp_link: url }).eq("id", cuota.id);
  return NextResponse.redirect(url);
}
