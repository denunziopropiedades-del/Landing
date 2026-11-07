import type { SupabaseClient } from "@supabase/supabase-js";

/** Link personal del cliente financiado para ver sus cuotas (sin usuario ni contraseña). */
export function linkMisCuotas(token: string | null | undefined): string | null {
  if (!token) return null;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
  return `${site}/mis-cuotas/${token}`;
}

export type CuotaPortal = {
  numero: number;
  montoUsd: number;
  vencimiento: string;
  pagada: boolean;
  pagadoEn: string | null;
  montoPagadoUsd: number | null;
  montoPagadoArs: number | null;
};

export type PortalCuotas = {
  nombre: string;
  proyecto: string | null;
  ubicacion: string | null;
  lotes: { manzana: string; numero: string; superficieM2: number | null }[];
  moneda: "USD" | "ARS";
  totalCuotas: number;
  anticipoUsd: number | null;
  cuotas: CuotaPortal[];
};

/** Datos de la página "Mis cuotas" a partir del token del link. Null si el link no es válido. */
export async function cargarPortalCuotas(admin: SupabaseClient, token: string): Promise<PortalCuotas | null> {
  if (!/^[a-f0-9]{20,64}$/i.test(token)) return null;
  const { data: l } = await admin
    .from("leads")
    .select(
      `id, nombre, apellido, manzana, plan_financiacion, forma_pago,
       proyectos(nombre, ubicacion),
       lotes(manzana, numero, superficie_m2),
       lead_lotes(lotes(manzana, numero, superficie_m2))`
    )
    .eq("portal_token", token)
    .maybeSingle();
  if (!l) return null;

  const { data: cs } = await admin
    .from("cuotas")
    .select("*")
    .eq("lead_id", l.id)
    .order("numero");

  const plan = l.plan_financiacion as { cuotas?: number; anticipoUsd?: number; moneda?: string } | null;
  const proyecto = l.proyectos as unknown as { nombre: string; ubicacion: string | null } | null;
  type LoteRaw = { manzana: string; numero: string; superficie_m2: number | null };
  const deLeadLotes = ((l.lead_lotes ?? []) as unknown as { lotes: LoteRaw | null }[]).map((x) => x.lotes).filter((x): x is LoteRaw => !!x);
  const loteSolo = l.lotes as unknown as LoteRaw | null;
  const lotes = (deLeadLotes.length ? deLeadLotes : loteSolo ? [loteSolo] : []).map((x) => ({
    manzana: String(x.manzana ?? l.manzana ?? ""),
    numero: String(x.numero ?? ""),
    superficieM2: x.superficie_m2 ?? null,
  }));
  const cuotas: CuotaPortal[] = (cs ?? []).map((c) => ({
    numero: Number(c.numero),
    montoUsd: Number(c.monto_usd),
    vencimiento: String(c.vencimiento),
    pagada: !!c.pagada,
    pagadoEn: (c.pagado_en as string | null) ?? null,
    montoPagadoUsd: c.monto_pagado_usd === null || c.monto_pagado_usd === undefined ? null : Number(c.monto_pagado_usd),
    montoPagadoArs: c.monto_pagado_ars === null || c.monto_pagado_ars === undefined ? null : Number(c.monto_pagado_ars),
  }));

  return {
    nombre: [l.nombre, l.apellido].filter(Boolean).join(" "),
    proyecto: proyecto?.nombre ?? null,
    ubicacion: proyecto?.ubicacion ?? null,
    lotes,
    moneda: plan?.moneda === "ARS" ? "ARS" : "USD",
    totalCuotas: Math.max(plan?.cuotas ?? 0, cuotas.length),
    anticipoUsd: plan?.anticipoUsd ?? null,
    cuotas,
  };
}
