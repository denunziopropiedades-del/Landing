"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminCandidatos, CandidatosActionError } from "@/lib/candidatos/auth";
import { candidatoAdminSchema, configuracionSchema } from "@/lib/candidatos/schemas";
import { calcularPuntaje } from "@/lib/candidatos/scoring";
import { getConfiguracion } from "@/lib/candidatos/data";
import type { EstadoCandidato } from "@/types/candidatos";

type ActionResult = { ok: true } | { ok: false; error: string };

function fail(err: unknown): ActionResult {
  if (err instanceof CandidatosActionError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function optNum(fd: FormData, key: string): number | undefined {
  const v = str(fd, key);
  return v.length > 0 ? Number(v) : undefined;
}

export async function loginCandidatosAction(_prevState: unknown, formData: FormData) {
  const email = str(formData, "email");
  const password = str(formData, "password");

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, error: "Supabase no está configurado en este entorno." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: "Email o contraseña incorrectos." };

  redirect("/postulantes");
}

export async function logoutCandidatosAction() {
  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/postulantes/login");
}

function formToCandidatoInput(formData: FormData) {
  return candidatoAdminSchema.parse({
    nombreApellido: str(formData, "nombreApellido"),
    dni: str(formData, "dni"),
    telefono: str(formData, "telefono"),
    localidad: str(formData, "localidad"),
    edad: str(formData, "edad"),
    cargo: str(formData, "cargo"),
    anosExperiencia: str(formData, "anosExperiencia") || "0",
    especialidad: str(formData, "especialidad"),
    trabajosQueSabe: str(formData, "trabajosQueSabe"),
    experienciaComprobable: formData.get("experienciaComprobable") === "on",
    referenciasLaborales: str(formData, "referenciasLaborales"),
    disponibilidadInicio: str(formData, "disponibilidadInicio"),
    disponibilidadHoraria: str(formData, "disponibilidadHoraria"),
    pretensionSalarialDiaria: optNum(formData, "pretensionSalarialDiaria"),
    ultimaRemuneracionDiaria: optNum(formData, "ultimaRemuneracionDiaria"),
    aceptaJornada: formData.get("aceptaJornada") === "on",
    aceptaObra: formData.get("aceptaObra") === "on",
    herramientasPropias: formData.get("herramientasPropias") === "on",
    movilidadPropia: formData.get("movilidadPropia") === "on",
    observaciones: str(formData, "observaciones"),
    estado: str(formData, "estado") || "pendiente",
  });
}

export async function crearCandidatoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminCandidatos();
    const admin = (await getSupabaseAdminClient())!;
    const data = formToCandidatoInput(formData);
    const config = await getConfiguracion();
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

    const { error } = await admin.from("candidatos").insert({
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
      estado: data.estado,
      origen: "manual",
      puntaje,
      clasificacion,
    });

    if (error) throw new CandidatosActionError(error.message);
  } catch (err) {
    return fail(err);
  }

  revalidatePath("/postulantes/candidatos");
  revalidatePath("/postulantes");
  redirect("/postulantes/candidatos");
}

export async function actualizarCandidatoAction(
  id: string,
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdminCandidatos();
    const admin = (await getSupabaseAdminClient())!;
    const data = formToCandidatoInput(formData);
    const config = await getConfiguracion();
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

    const { error } = await admin
      .from("candidatos")
      .update({
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
        estado: data.estado,
        puntaje,
        clasificacion,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) throw new CandidatosActionError(error.message);
  } catch (err) {
    return fail(err);
  }

  revalidatePath(`/postulantes/candidatos/${id}`);
  revalidatePath("/postulantes/candidatos");
  revalidatePath("/postulantes");
  redirect(`/postulantes/candidatos/${id}`);
}

export async function cambiarEstadoAction(id: string, estado: EstadoCandidato): Promise<ActionResult> {
  try {
    await requireAdminCandidatos();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin
      .from("candidatos")
      .update({ estado, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new CandidatosActionError(error.message);
  } catch (err) {
    return fail(err);
  }

  revalidatePath(`/postulantes/candidatos/${id}`);
  revalidatePath("/postulantes/candidatos");
  revalidatePath("/postulantes");
  return { ok: true };
}

export async function agregarObservacionAction(id: string, observaciones: string): Promise<ActionResult> {
  try {
    await requireAdminCandidatos();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin
      .from("candidatos")
      .update({ observaciones, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new CandidatosActionError(error.message);
  } catch (err) {
    return fail(err);
  }

  revalidatePath(`/postulantes/candidatos/${id}`);
  return { ok: true };
}

export async function eliminarCandidatoAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminCandidatos();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("candidatos").delete().eq("id", id);
    if (error) throw new CandidatosActionError(error.message);
  } catch (err) {
    return fail(err);
  }

  revalidatePath("/postulantes/candidatos");
  revalidatePath("/postulantes");
  return { ok: true };
}

export async function actualizarConfiguracionAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  try {
    await requireAdminCandidatos();
    const admin = (await getSupabaseAdminClient())!;

    const parsed = configuracionSchema.parse({
      pesos: {
        experiencia: str(formData, "pesos.experiencia"),
        cargo: str(formData, "pesos.cargo"),
        especialidad: str(formData, "pesos.especialidad"),
        disponibilidad: str(formData, "pesos.disponibilidad"),
        pretensionSalarial: str(formData, "pesos.pretensionSalarial"),
        referencias: str(formData, "pesos.referencias"),
        herramientas: str(formData, "pesos.herramientas"),
        movilidad: str(formData, "pesos.movilidad"),
      },
      salarioReferencia: str(formData, "salarioReferencia"),
      mensajeWhatsapp: str(formData, "mensajeWhatsapp"),
    });

    const { error } = await admin
      .from("candidatos_configuracion")
      .update({
        pesos: parsed.pesos,
        salario_referencia: parsed.salarioReferencia,
        mensaje_whatsapp: parsed.mensajeWhatsapp,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) throw new CandidatosActionError(error.message);

    if (formData.get("recalcular") === "on") {
      const { data: candidatos } = await admin.from("candidatos").select("*");
      for (const c of candidatos ?? []) {
        const { puntaje, clasificacion } = calcularPuntaje(
          {
            anosExperiencia: Number(c.anos_experiencia ?? 0),
            cargo: c.cargo,
            especialidad: c.especialidad,
            disponibilidadInicio: c.disponibilidad_inicio,
            pretensionSalarialDiaria: c.pretension_salarial_diaria === null ? null : Number(c.pretension_salarial_diaria),
            referenciasLaborales: c.referencias_laborales,
            herramientasPropias: c.herramientas_propias,
            movilidadPropia: c.movilidad_propia,
          },
          parsed
        );
        await admin.from("candidatos").update({ puntaje, clasificacion }).eq("id", c.id);
      }
    }
  } catch (err) {
    return fail(err);
  }

  revalidatePath("/postulantes/configuracion");
  revalidatePath("/postulantes/candidatos");
  revalidatePath("/postulantes");
  return { ok: true };
}
