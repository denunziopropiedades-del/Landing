import { NextResponse } from "next/server";
import { postulacionSchema } from "@/lib/candidatos/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { buscarDuplicado, getConfiguracionPublica } from "@/lib/candidatos/data";
import { calcularPuntaje } from "@/lib/candidatos/scoring";

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "postulacion");
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = postulacionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  const admin = await getSupabaseAdminClient();
  if (!admin) {
    // Modo demo sin Supabase: aceptamos igual para no romper la UX del formulario.
    return NextResponse.json({ ok: true, duplicado: false });
  }

  const config = await getConfiguracionPublica();
  const { puntaje, clasificacion } = calcularPuntaje(
    {
      anosExperiencia: data.anosExperiencia,
      cargo: data.cargo,
      especialidad: data.especialidad || null,
      disponibilidadInicio: data.disponibilidadInicio || null,
      pretensionSalarialDiaria: data.pretensionSalarialDiaria ?? null,
      referenciasLaborales: data.referenciasLaborales || null,
      herramientasPropias: data.herramientasPropias,
      movilidadPropia: data.movilidadPropia,
    },
    config
  );

  const payload = {
    nombre_apellido: data.nombreApellido,
    dni: data.dni,
    telefono: data.telefono,
    localidad: data.localidad,
    edad: data.edad,
    cargo: data.cargo,
    anos_experiencia: data.anosExperiencia,
    especialidad: data.especialidad || null,
    trabajos_que_sabe: data.trabajosQueSabe || null,
    experiencia_comprobable: data.experienciaComprobable,
    referencias_laborales: data.referenciasLaborales || null,
    disponibilidad_inicio: data.disponibilidadInicio || null,
    disponibilidad_horaria: data.disponibilidadHoraria || null,
    pretension_salarial_diaria: data.pretensionSalarialDiaria ?? null,
    ultima_remuneracion_diaria: data.ultimaRemuneracionDiaria ?? null,
    acepta_jornada: data.aceptaJornada,
    acepta_obra: data.aceptaObra,
    herramientas_propias: data.herramientasPropias,
    movilidad_propia: data.movilidadPropia,
    observaciones: data.observaciones || null,
    puntaje,
    clasificacion,
  };

  // Si ya existe un candidato con el mismo DNI o teléfono, actualizamos su ficha
  // en vez de crear un duplicado (re-postulación).
  const existente = await buscarDuplicado(data.dni, data.telefono);

  if (existente) {
    const { error } = await admin
      .from("candidatos")
      .update({ ...payload, actualizado_en: new Date().toISOString() })
      .eq("id", existente.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, duplicado: true });
  }

  const { error } = await admin.from("candidatos").insert({ ...payload, estado: "pendiente", origen: "publica" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, duplicado: false });
}
