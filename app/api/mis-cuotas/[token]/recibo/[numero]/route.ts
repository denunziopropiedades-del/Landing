import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { generarReciboCuotaPdf } from "@/lib/recibo-cuota-pdf";

export const runtime = "nodejs";

/** Recibo de pago (no factura) de una cuota pagada. Acceso con el link de "Mis cuotas" del cliente. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string; numero: string }> }) {
  const { token, numero } = await params;
  if (!/^[a-f0-9]{20,64}$/i.test(token) || !/^\d{1,4}$/.test(numero)) return new Response("No encontrado", { status: 404 });
  const admin = await getSupabaseAdminClient();
  if (!admin) return new Response("No disponible", { status: 503 });

  const { data: l } = await admin
    .from("leads")
    .select(
      "id, nombre, apellido, dni, manzana, plan_financiacion, honorario_cobranza, proyectos(nombre), lotes(manzana, numero), lead_lotes(lotes(manzana, numero))"
    )
    .eq("portal_token", token)
    .maybeSingle();
  if (!l) return new Response("No encontrado", { status: 404 });

  const { data: cs } = await admin.from("cuotas").select("*").eq("lead_id", l.id).order("numero");
  const c = (cs ?? []).find((x) => Number(x.numero) === Number(numero));
  if (!c || !c.pagada || !c.pagado_en) return new Response("Esta cuota todavía no figura como pagada.", { status: 404 });

  type LoteRaw = { manzana: string; numero: string };
  const lotes = [
    ...((l.lead_lotes ?? []) as unknown as { lotes: LoteRaw | null }[]).map((x) => x.lotes).filter((x): x is LoteRaw => !!x),
  ];
  const loteSolo = l.lotes as unknown as LoteRaw | null;
  const listaLotes = (lotes.length ? lotes : loteSolo ? [loteSolo] : []).map((x) => `Manzana ${x.manzana ?? l.manzana ?? ""} · Lote ${x.numero}`);
  const plan = l.plan_financiacion as { moneda?: string } | null;
  const moneda = plan?.moneda === "ARS" ? "ARS" : "USD";

  const pdf = await generarReciboCuotaPdf({
    numeroRecibo: `RC-${String(c.id).slice(0, 8).toUpperCase()}`,
    cliente: [l.nombre, l.apellido].filter(Boolean).join(" "),
    dni: (l.dni as string | null) ?? null,
    proyecto: (l.proyectos as unknown as { nombre: string } | null)?.nombre ?? null,
    lotes: listaLotes.length ? listaLotes.join(" / ") : null,
    cuotaNumero: Number(c.numero),
    vencimiento: String(c.vencimiento),
    pagadoEn: String(c.pagado_en),
    moneda,
    montoPagado: Number(c.monto_pagado_usd ?? c.monto_usd),
    montoPagadoArs: c.monto_pagado_ars == null ? null : Number(c.monto_pagado_ars),
    cotizacion: c.cotizacion == null ? null : Number(c.cotizacion),
    medioPago: (c.medio_pago as string | null) ?? null,
    honorario: Number(l.honorario_cobranza) || null,
    cuotasPagadas: (cs ?? []).filter((x) => x.pagada).length,
  });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="recibo-cuota-${numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
