import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapContrato, mapCuota, mapLiquidacion, mapPersona } from "@/lib/alquileres";
import { generarLiquidacionPdf } from "@/lib/alquileres-pdf";
import { esStaffAlquileres } from "@/lib/alquileres-acceso";

export const runtime = "nodejs";

/** Liquidación en PDF. La ve el panel, o el propietario con su link (?t=token). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const admin = await getSupabaseAdminClient();
  if (!admin) return new Response("No disponible", { status: 503 });

  const { data } = await admin
    .from("alq_liquidaciones")
    .select(
      "*, alq_contratos(*, inquilino:alq_personas!alq_contratos_inquilino_id_fkey(*), propietario:alq_personas!alq_contratos_propietario_id_fkey(*))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return new Response("Liquidación no encontrada", { status: 404 });
  const c = data.alq_contratos as Record<string, unknown> & { inquilino: Record<string, unknown>; propietario: Record<string, unknown> };
  const autorizado = (token && token === c.propietario?.token) || (await esStaffAlquileres());
  if (!autorizado) return new Response("No autorizado", { status: 401 });

  const { data: cuotas } = await admin.from("alq_cuotas").select("*").eq("liquidacion_id", id).order("periodo");
  const pdf = await generarLiquidacionPdf({
    liquidacion: mapLiquidacion(data),
    contrato: mapContrato(c),
    propietario: mapPersona(c.propietario),
    inquilino: mapPersona(c.inquilino),
    cuotas: (cuotas ?? []).map(mapCuota),
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="liquidacion-${String(data.periodo).slice(0, 7)}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
