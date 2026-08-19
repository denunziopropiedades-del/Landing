import { NextResponse } from "next/server";
import { z } from "zod";
import { crearLinkPagoSena, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  leadId: z.string().min(1),
  nombre: z.string().trim().min(2),
  email: z.string().trim().email(),
});

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "mercadopago", 5, 60);
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  if (!isMercadoPagoConfigured()) {
    return NextResponse.json(
      { error: "Mercado Pago no está configurado. Definí MERCADOPAGO_ACCESS_TOKEN para habilitar el pago online de la seña." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { leadId, nombre, email } = parsed.data;

  const supabase = await getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "El pago online no está disponible en este momento." }, { status: 503 });
  }

  const { data: lote_lotes } = await supabase.from("lead_lotes").select("lotes(nombre)").eq("lead_id", leadId);
  const lotes = ((lote_lotes ?? []) as unknown as { lotes: { nombre: string } | null }[])
    .map((ll) => ll.lotes)
    .filter((l): l is { nombre: string } => l !== null);

  if (lotes.length === 0) {
    return NextResponse.json({ error: "Operación inválida" }, { status: 400 });
  }

  const initPoint = await crearLinkPagoSena({
    leadId,
    nombre,
    email,
    lotesNombres: lotes.map((l) => l.nombre),
  });

  if (!initPoint) {
    return NextResponse.json({ error: "No se pudo generar el link de pago." }, { status: 503 });
  }

  return NextResponse.json({ initPoint });
}
