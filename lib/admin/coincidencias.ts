import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import type { LeadConBusqueda, LoteDisponible } from "@/lib/coincidencias";

const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

export async function getDatosCoincidencias(): Promise<{
  lotes: LoteDisponible[];
  leads: LeadConBusqueda[];
  faltaSql: boolean;
}> {
  const vacio = { lotes: [], leads: [], faltaSql: false };
  const perfil = await getPerfilActual();
  if (!perfil) return vacio;
  const admin = await getSupabaseAdminClient();
  if (!admin) return vacio;

  const { data: lotes } = await admin
    .from("lotes")
    .select("id, manzana, numero, superficie_m2, precio_usd, anticipo_financiado_usd, cuotas_financiado, valor_cuota_financiado_usd, proyectos(nombre, ubicacion)")
    .eq("estado", "disponible")
    .order("precio_usd", { ascending: true })
    .limit(2000);

  let consulta = admin
    .from("leads")
    .select("id, nombre, apellido, telefono, estado, origen, busqueda_presupuesto_usd, busqueda_zona, busqueda_pago, busqueda_anticipo, busqueda_notas, asignado_a")
    .not("estado", "in", "(vendido,descartado)")
    .order("actualizado_en", { ascending: false })
    .limit(1000);
  if (perfil.rol === "vendedor") consulta = consulta.eq("asignado_a", perfil.id);
  const { data: leads, error } = await consulta;

  return {
    faltaSql: Boolean(error && /column|schema cache/i.test(error.message)),
    lotes: (lotes ?? []).map((l) => {
      const p = l.proyectos as unknown as { nombre: string; ubicacion: string | null } | null;
      return {
        id: l.id as string,
        proyecto: p?.nombre ?? "",
        zona: p?.ubicacion ?? "",
        manzana: String(l.manzana ?? ""),
        numero: String(l.numero ?? ""),
        superficieM2: n(l.superficie_m2),
        precioUsd: n(l.precio_usd),
        anticipoUsd: n(l.anticipo_financiado_usd),
        cuotas: n(l.cuotas_financiado),
        valorCuotaUsd: n(l.valor_cuota_financiado_usd),
      };
    }),
    leads: (error ? [] : (leads ?? [])).map((l) => ({
      id: l.id as string,
      nombre: [l.nombre, l.apellido].filter(Boolean).join(" "),
      telefono: String(l.telefono ?? ""),
      estado: String(l.estado),
      origen: (l.origen as string | null) ?? null,
      presupuestoUsd: n(l.busqueda_presupuesto_usd),
      zona: (l.busqueda_zona as string | null) ?? null,
      pago: (l.busqueda_pago as string | null) ?? null,
      anticipo: (l.busqueda_anticipo as string | null) ?? null,
      notas: (l.busqueda_notas as string | null) ?? null,
    })),
  };
}
