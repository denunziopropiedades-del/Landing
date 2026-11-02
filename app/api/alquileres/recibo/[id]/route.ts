import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapContrato, mapCuota, mapPersona } from "@/lib/alquileres";
import { generarReciboAlquilerPdf } from "@/lib/alquileres-pdf";
import { esStaffAlquileres } from "@/lib/alquileres-acceso";

export const runtime = "nodejs";

/** Recibo en PDF de un mes pagado. Lo ve el panel, o el inquilino/propietario con su link (?t=token). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") ?? "";
  const admin = await getSupabaseAdminClient();
  if (!admin) return new Response("No disponible", { status: 503 });

  const { data } = await admin
    .from("alq_cuotas")
    .select(
      "*, alq_contratos(*, inquilino:alq_personas!alq_contratos_inquilino_id_fkey(*), propietario:alq_personas!alq_contratos_propietario_id_fkey(*))"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data || !data.pagado_en) return new Response("Recibo no encontrado", { status: 404 });
  const c = data.alq_contratos as Record<string, unknown> & { inquilino: Record<string, unknown>; propietario: Record<string, unknown> };
  const autorizado = (token && (token === c.inquilino?.token || token === c.propietario?.token)) || (await esStaffAlquileres());
  if (!autorizado) return new Response("No autorizado", { status: 401 });

  const cuota = mapCuota(data);
  const pdf = await generarReciboAlquilerPdf({
    cuota,
    contrato: mapContrato(c),
    inquilino: mapPersona(c.inquilino),
    propietario: mapPersona(c.propietario),
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-${String(cuota.reciboNumero ?? 0).padStart(6, "0")}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
