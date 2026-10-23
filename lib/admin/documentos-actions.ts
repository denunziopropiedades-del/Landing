"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { MODELOS_INCORPORADOS, type Modelo } from "@/lib/documentos/plantillas";

type R<T = undefined> = ({ ok: true } & (T extends undefined ? object : { data: T })) | { ok: false; error: string };

const SIN_TABLAS = "Falta crear las tablas de documentos: corré sql-documentos.sql en Supabase → SQL Editor.";
const errorDb = (m: string) => (/does not exist|Could not find the table/i.test(m) ? SIN_TABLAS : m);

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError || err instanceof Error) return { ok: false, error: err.message };
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

export type DocumentoGenerado = {
  id: string;
  creadoEn: string;
  creadoPor: string | null;
  modeloId: string;
  modeloNombre: string;
  titulo: string;
  cuerpo: string;
  valores: Record<string, string>;
  leadId: string | null;
};

export type ClienteParaDocumento = { id: string; etiqueta: string; datos: Record<string, string> };

/** Modelos incorporados + propios, historial y clientes del CRM para completar. */
export async function getDatosDocumentos(): Promise<{
  modelos: Modelo[];
  historial: DocumentoGenerado[];
  clientes: ClienteParaDocumento[];
  avisoTablas: string | null;
}> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { modelos: MODELOS_INCORPORADOS, historial: [], clientes: [], avisoTablas: null };

  const [m, h, l] = await Promise.all([
    supabase.from("modelos_documento").select("*").order("nombre"),
    supabase.from("documentos_generados").select("*").order("creado_en", { ascending: false }).limit(60),
    supabase
      .from("leads")
      .select("id, nombre, apellido, dni, email, telefono, manzana, importe_cobrado, fecha_firma_escribania, proyectos(nombre, ubicacion, escribania_nombre, escribania_direccion), lotes(numero, manzana, superficie_m2), lead_lotes(lotes(numero, superficie_m2))")
      .neq("estado", "descartado")
      .order("actualizado_en", { ascending: false })
      .limit(300),
  ]);

  const propios: Modelo[] = (m.data ?? []).map((x) => ({
    id: x.id as string,
    nombre: x.nombre as string,
    categoria: (x.categoria as string) ?? "Contratos",
    cuerpo: x.cuerpo as string,
  }));

  const historial: DocumentoGenerado[] = (h.data ?? []).map((x) => ({
    id: x.id,
    creadoEn: x.creado_en,
    creadoPor: x.creado_por_email ?? null,
    modeloId: x.modelo_id,
    modeloNombre: x.modelo_nombre,
    titulo: x.titulo,
    cuerpo: x.cuerpo,
    valores: (x.valores as Record<string, string>) ?? {},
    leadId: x.lead_id ?? null,
  }));

  const clientes: ClienteParaDocumento[] = (l.data ?? []).map((x) => {
    const proyecto = x.proyectos as unknown as { nombre: string; ubicacion: string; escribania_nombre: string | null; escribania_direccion: string | null } | null;
    const lote = x.lotes as unknown as { numero: string; manzana: string; superficie_m2: number } | null;
    const varios = ((x.lead_lotes ?? []) as unknown as { lotes: { numero: string; superficie_m2: number } | null }[])
      .map((ll) => ll.lotes)
      .filter((v): v is NonNullable<typeof v> => v !== null);
    const lotes = varios.length ? varios : lote ? [lote] : [];
    const nombreCompleto = `${x.nombre ?? ""} ${x.apellido ?? ""}`.trim();
    const datos: Record<string, string> = {
      Cliente: nombreCompleto,
      "Nombre del cliente": nombreCompleto,
      Comprador: nombreCompleto,
      Locatario: nombreCompleto,
      "DNI del cliente": x.dni ?? "",
      DNI: x.dni ?? "",
      "Teléfono del cliente": x.telefono ?? "",
      "Email del cliente": x.email ?? "",
      Proyecto: proyecto?.nombre ?? "",
      Desarrollo: proyecto?.nombre ?? "",
      "Ubicación del proyecto": proyecto?.ubicacion ?? "",
      Manzana: x.manzana ?? lote?.manzana ?? "",
      Lote: lotes.map((v) => v.numero).join(", "),
      Lotes: lotes.map((v) => v.numero).join(", "),
      Superficie: lotes.length ? `${lotes.reduce((a, v) => a + (Number(v.superficie_m2) || 0), 0)} m²` : "",
      "Importe de la seña": x.importe_cobrado ? String(x.importe_cobrado) : "",
      Escribanía: proyecto?.escribania_nombre ?? "",
      "Domicilio de la escribanía": proyecto?.escribania_direccion ?? "",
      "Fecha de firma": x.fecha_firma_escribania ?? "",
    };
    for (const k of Object.keys(datos)) if (!datos[k]) delete datos[k];
    return {
      id: x.id,
      etiqueta: [nombreCompleto || x.email, proyecto?.nombre, lotes.length ? `Lote ${lotes.map((v) => v.numero).join(", ")}` : null]
        .filter(Boolean)
        .join(" · "),
      datos,
    };
  });

  return {
    modelos: [...MODELOS_INCORPORADOS, ...propios],
    historial,
    clientes,
    avisoTablas: m.error ? errorDb(m.error.message) : null,
  };
}

export async function guardarModeloAction(input: { id?: string; nombre: string; categoria: string; cuerpo: string }): Promise<R<{ id: string }>> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const nombre = input.nombre.trim();
    const cuerpo = input.cuerpo.trim();
    if (nombre.length < 3) throw new AdminActionError("Poné un nombre al modelo.");
    if (cuerpo.length < 20) throw new AdminActionError("El texto del modelo está vacío.");
    if (input.id && MODELOS_INCORPORADOS.some((m) => m.id === input.id))
      throw new AdminActionError("Los modelos que vienen con el sistema no se editan: guardalo como copia.");
    const admin = (await getSupabaseAdminClient())!;
    const fila = { nombre, categoria: input.categoria.trim() || "Contratos", cuerpo, actualizado_en: new Date().toISOString() };
    if (input.id) {
      const { error } = await admin.from("modelos_documento").update(fila).eq("id", input.id);
      if (error) throw new Error(errorDb(error.message));
      await registrarActividad(actor, "actualizar", "modelo_documento", input.id, { nombre });
      revalidatePath("/admin/documentos");
      return { ok: true, data: { id: input.id } };
    }
    const { data, error } = await admin.from("modelos_documento").insert(fila).select("id").single();
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, "crear", "modelo_documento", data.id, { nombre });
    revalidatePath("/admin/documentos");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarModeloAction(id: string): Promise<R> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("modelos_documento").delete().eq("id", id);
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, "eliminar", "modelo_documento", id);
    revalidatePath("/admin/documentos");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Guarda en el historial los datos con los que se generó un PDF (para volver a descargarlo o editarlo). */
export async function registrarDocumentoAction(input: {
  modeloId: string;
  modeloNombre: string;
  titulo: string;
  cuerpo: string;
  valores: Record<string, string>;
  leadId?: string | null;
}): Promise<R<{ id: string }>> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;
    const { data, error } = await admin
      .from("documentos_generados")
      .insert({
        creado_por: actor.id,
        creado_por_email: actor.email,
        modelo_id: input.modeloId,
        modelo_nombre: input.modeloNombre,
        titulo: input.titulo.slice(0, 200),
        cuerpo: input.cuerpo,
        valores: input.valores,
        lead_id: input.leadId || null,
      })
      .select("id")
      .single();
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, "generar", "documento", data.id, { modelo: input.modeloNombre, titulo: input.titulo });
    revalidatePath("/admin/documentos");
    return { ok: true, data: { id: data.id } };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarDocumentoAction(id: string): Promise<R> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("documentos_generados").delete().eq("id", id);
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, "eliminar", "documento", id);
    revalidatePath("/admin/documentos");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
