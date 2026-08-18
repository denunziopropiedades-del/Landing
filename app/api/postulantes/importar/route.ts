import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireAdminCandidatos, CandidatosActionError } from "@/lib/candidatos/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { mapearEncabezados, procesarFila } from "@/lib/candidatos/importar";
import { getConfiguracion } from "@/lib/candidatos/data";
import { calcularPuntaje } from "@/lib/candidatos/scoring";

export async function POST(request: Request) {
  try {
    await requireAdminCandidatos();
  } catch (err) {
    const message = err instanceof CandidatosActionError ? err.message : "No autorizado";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  const admin = (await getSupabaseAdminClient())!;
  const formData = await request.formData();
  const archivo = formData.get("archivo");

  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  const buffer = await archivo.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    return NextResponse.json({ error: "El archivo no es un Excel válido (.xlsx)." }, { status: 400 });
  }

  const hoja = workbook.worksheets[0];
  if (!hoja) {
    return NextResponse.json({ error: "El archivo no tiene ninguna hoja." }, { status: 400 });
  }

  const encabezados = (hoja.getRow(1).values as unknown[]).map((v) => (v == null ? "" : String(v)));
  // ExcelJS antepone un elemento vacío en el índice 0 (las columnas son 1-based); lo sacamos
  // para que el índice de mapearEncabezados/procesarFila coincida con fila[i].
  encabezados.shift();
  const mapa = mapearEncabezados(encabezados);

  if (!("nombreApellido" in mapa) || !("dni" in mapa) || !("telefono" in mapa)) {
    return NextResponse.json(
      { error: "El Excel debe tener al menos columnas de Nombre y apellido, DNI y Teléfono." },
      { status: 400 }
    );
  }

  const config = await getConfiguracion();

  let creados = 0;
  let actualizados = 0;
  let omitidos = 0;

  for (let i = 2; i <= hoja.rowCount; i++) {
    const valores = (hoja.getRow(i).values as unknown[]).slice(1);
    if (valores.every((v) => v === null || v === undefined || v === "")) continue;

    const payload = procesarFila(valores, mapa);
    if (!payload) {
      omitidos++;
      continue;
    }

    const { puntaje, clasificacion } = calcularPuntaje(
      {
        anosExperiencia: payload.anos_experiencia,
        cargo: payload.cargo,
        especialidad: payload.especialidad,
        disponibilidadInicio: payload.disponibilidad_inicio,
        pretensionSalarialDiaria: payload.pretension_salarial_diaria,
        referenciasLaborales: payload.referencias_laborales,
        herramientasPropias: payload.herramientas_propias,
        movilidadPropia: payload.movilidad_propia,
      },
      config
    );

    const { data: existente } = await admin
      .from("candidatos")
      .select("id")
      .or(`dni.eq.${payload.dni},telefono.eq.${payload.telefono}`)
      .limit(1)
      .maybeSingle();

    if (existente) {
      const { error } = await admin
        .from("candidatos")
        .update({ ...payload, puntaje, clasificacion, actualizado_en: new Date().toISOString() })
        .eq("id", existente.id);
      if (error) omitidos++;
      else actualizados++;
    } else {
      const { error } = await admin.from("candidatos").insert({ ...payload, puntaje, clasificacion, origen: "importado" });
      if (error) omitidos++;
      else creados++;
    }
  }

  return NextResponse.json({ ok: true, creados, actualizados, omitidos });
}
