import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapContrato,
  mapCuota,
  mapLiquidacion,
  mapPersona,
  mapServicio,
  periodosContrato,
  vencimientoDe,
  hoyIso,
  type ContratoAlq,
  type CuotaAlq,
  type LiquidacionAlq,
  type PersonaAlq,
  type ServicioAlq,
} from "@/lib/alquileres";

export type DatosAlquileres = {
  personas: PersonaAlq[];
  contratos: ContratoAlq[];
  cuotas: CuotaAlq[];
  servicios: ServicioAlq[];
  liquidaciones: LiquidacionAlq[];
  faltaSql: boolean;
};

const VACIO: DatosAlquileres = { personas: [], contratos: [], cuotas: [], servicios: [], liquidaciones: [], faltaSql: false };

/** Mes siguiente al de hoy (para que el próximo alquiler ya figure cargado). */
function hastaMesProximo(): string {
  const [a, m] = hoyIso().split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 1)); // m ya es "mes + 1" en base 0
  return d.toISOString().slice(0, 10);
}

/**
 * Crea los meses que falten de cada contrato activo (desde el inicio hasta el mes próximo),
 * con el monto actual del contrato. Es idempotente: no toca los meses ya creados.
 */
export async function asegurarCuotas(admin: SupabaseClient, contratos: ContratoAlq[]): Promise<number> {
  const activos = contratos.filter((c) => c.estado === "activo");
  if (!activos.length) return 0;
  const hasta = hastaMesProximo();
  const { data: existentes } = await admin
    .from("alq_cuotas")
    .select("contrato_id, periodo")
    .in(
      "contrato_id",
      activos.map((c) => c.id)
    );
  const ya = new Set((existentes ?? []).map((e) => `${e.contrato_id}|${e.periodo}`));
  const nuevas = activos.flatMap((c) =>
    periodosContrato(c, hasta)
      .filter((p) => !ya.has(`${c.id}|${p}`))
      .map((p) => ({ contrato_id: c.id, periodo: p, vencimiento: vencimientoDe(p, c.diaVencimiento), monto: c.montoActual }))
  );
  if (!nuevas.length) return 0;
  const { error } = await admin.from("alq_cuotas").upsert(nuevas, { onConflict: "contrato_id,periodo", ignoreDuplicates: true });
  if (error) console.error("No se pudieron generar los meses de alquiler", error);
  return error ? 0 : nuevas.length;
}

/** Todo el módulo (para el panel). */
export async function cargarAlquileres(admin: SupabaseClient): Promise<DatosAlquileres> {
  const { data: contratosRaw, error } = await admin.from("alq_contratos").select("*").order("creado_en", { ascending: false });
  if (error) return { ...VACIO, faltaSql: /alq_|schema cache|does not exist/i.test(error.message) };
  const contratos = (contratosRaw ?? []).map(mapContrato);
  await asegurarCuotas(admin, contratos);

  const [personas, cuotas, servicios, liquidaciones] = await Promise.all([
    admin.from("alq_personas").select("*").order("nombre"),
    admin.from("alq_cuotas").select("*").order("periodo", { ascending: false }).limit(5000),
    admin.from("alq_servicios").select("*").order("vencimiento", { ascending: false }).limit(5000),
    admin.from("alq_liquidaciones").select("*").order("creado_en", { ascending: false }).limit(2000),
  ]);
  return {
    personas: (personas.data ?? []).map(mapPersona),
    contratos,
    cuotas: (cuotas.data ?? []).map(mapCuota),
    servicios: (servicios.data ?? []).map(mapServicio),
    liquidaciones: (liquidaciones.data ?? []).map(mapLiquidacion),
    faltaSql: false,
  };
}

/** Lo que ve un inquilino o propietario desde su link privado. */
export async function cargarPortal(
  admin: SupabaseClient,
  token: string
): Promise<{ persona: PersonaAlq; datos: DatosAlquileres } | null> {
  if (!/^[a-f0-9]{24,64}$/i.test(token)) return null;
  const { data: p } = await admin.from("alq_personas").select("*").eq("token", token).maybeSingle();
  if (!p) return null;
  const persona = mapPersona(p);
  const campo = persona.tipo === "inquilino" ? "inquilino_id" : "propietario_id";
  const { data: cs } = await admin.from("alq_contratos").select("*").eq(campo, persona.id).order("fecha_inicio", { ascending: false });
  const contratos = (cs ?? []).map(mapContrato);
  await asegurarCuotas(admin, contratos);
  const ids = contratos.map((c) => c.id);
  if (!ids.length) return { persona, datos: { ...VACIO, personas: [persona] } };

  const [cuotas, servicios, liquidaciones] = await Promise.all([
    admin.from("alq_cuotas").select("*").in("contrato_id", ids).order("periodo", { ascending: false }),
    admin.from("alq_servicios").select("*").in("contrato_id", ids).order("vencimiento", { ascending: false }),
    persona.tipo === "propietario"
      ? admin.from("alq_liquidaciones").select("*").eq("propietario_id", persona.id).order("periodo", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  return {
    persona,
    datos: {
      personas: [persona],
      contratos,
      cuotas: (cuotas.data ?? []).map(mapCuota),
      servicios: (servicios.data ?? [])
        .map(mapServicio)
        .filter((s) => persona.tipo === "propietario" || s.aCargo === "inquilino"),
      liquidaciones: (liquidaciones.data ?? []).map(mapLiquidacion),
      faltaSql: false,
    },
  };
}
