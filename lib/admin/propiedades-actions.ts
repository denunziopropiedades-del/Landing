"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { mapPropiedad, slugify, type Propiedad } from "@/lib/propiedades-base";
import { getPartido } from "@/lib/zonas";
import { sanitizarHtml } from "@/lib/texto-enriquecido";

type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

function fail(err: unknown): ActionResult {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  if (err instanceof Error && err.message) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const optStr = (fd: FormData, k: string) => str(fd, k) || null;
/** Acepta "7.500", "7500", "1,5" o "1.5" (el punto con 3 dígitos detrás se toma como separador de miles). */
const optNum = (fd: FormData, k: string) => {
  let v = str(fd, k).replace(/[^\d.,]/g, "");
  if (!v) return null;
  if (v.includes(",")) v = v.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, "");
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function revalidarPortal(slug?: string) {
  revalidatePath("/admin/propiedades");
  revalidatePath("/");
  for (const ruta of ["/comprar", "/alquilar", "/campos", "/zonas"]) revalidatePath(ruta);
  revalidatePath("/zonas/[zona]", "page");
  if (slug) revalidatePath(`/propiedades/${slug}`);
}

const MENSAJE_SIN_TABLA =
  "Falta crear la tabla de propiedades: corré el archivo sql-propiedades.sql en Supabase → SQL Editor.";

function errorDb(message: string) {
  if (/financiacion_directa|situacion_dominial|tipo_barrio/i.test(message))
    return "Faltan las columnas nuevas (financiación directa / escritura o posesión / barrio cerrado o abierto): corré sql-propiedades-actualizacion.sql en Supabase → SQL Editor.";
  return /relation .*propiedades.* does not exist|Could not find the table/i.test(message) ? MENSAJE_SIN_TABLA : message;
}

/** Lista todas las propiedades (publicadas o no) para el panel. */
export async function getPropiedadesAdmin(): Promise<{ propiedades: Propiedad[]; error: string | null }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { propiedades: [], error: null };
  const { data, error } = await supabase
    .from("propiedades")
    .select("*")
    .order("destacado", { ascending: false })
    .order("creado_en", { ascending: false });
  if (error) return { propiedades: [], error: errorDb(error.message) };
  return { propiedades: (data ?? []).map(mapPropiedad), error: null };
}

export async function upsertPropiedadAction(_prev: ActionResult | null, fd: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;

    const id = optStr(fd, "id");
    const titulo = str(fd, "titulo");
    const partido = str(fd, "partido");
    if (titulo.length < 4) throw new AdminActionError("Poné un título (ej. “Casa 3 amb. con parque”).");
    if (!getPartido(partido)) throw new AdminActionError("Elegí el partido.");

    const tipo = str(fd, "tipo");
    const rural = tipo === "campo" || tipo === "chacra";
    const fotos = str(fd, "fotos")
      .split("\n")
      .map((f) => f.trim())
      .filter((f) => /^https?:\/\//.test(f));
    const etiquetas = str(fd, "etiquetas")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
      .slice(0, 6);

    const payload = {
      titulo,
      descripcion: sanitizarHtml(str(fd, "descripcion")),
      operacion: str(fd, "operacion"),
      tipo,
      partido,
      localidad: optStr(fd, "localidad"),
      direccion: optStr(fd, "direccion"),
      maps_url: optStr(fd, "mapsUrl"),
      precio: optNum(fd, "precio"),
      moneda: str(fd, "moneda") === "ARS" ? "ARS" : "USD",
      precio_unidad: str(fd, "precioUnidad") || "total",
      expensas: rural ? null : optNum(fd, "expensas"),
      ambientes: rural ? null : optNum(fd, "ambientes"),
      dormitorios: rural ? null : optNum(fd, "dormitorios"),
      banos: rural ? null : optNum(fd, "banos"),
      sup_cubierta: rural ? null : optNum(fd, "supCubierta"),
      sup_total: optNum(fd, "supTotal"),
      apto_credito: fd.get("aptoCredito") === "on",
      financiacion_directa: fd.get("financiacionDirecta") === "on",
      situacion_dominial: str(fd, "situacion") === "escritura" || str(fd, "situacion") === "posesion" ? str(fd, "situacion") : null,
      tipo_barrio: str(fd, "barrio") === "cerrado" || str(fd, "barrio") === "abierto" ? str(fd, "barrio") : null,
      hectareas: rural ? optNum(fd, "hectareas") : null,
      aptitud: rural ? optStr(fd, "aptitud") : null,
      agua: rural ? optStr(fd, "agua") : null,
      luz: rural ? (str(fd, "luz") === "si" ? true : str(fd, "luz") === "no" ? false : null) : null,
      etiquetas,
      fotos,
      destacado: fd.get("destacado") === "on",
      publicado: fd.get("publicado") === "on",
      actualizado_en: new Date().toISOString(),
    };

    let slug: string;
    if (id) {
      const { data, error } = await admin.from("propiedades").update(payload).eq("id", id).select("slug").single();
      if (error) throw new Error(errorDb(error.message));
      slug = data.slug;
      await registrarActividad(actor, "actualizar", "propiedad", id, { titulo, partido });
      revalidarPortal(slug);
      return { ok: true, id };
    }

    // Slug único: título + partido, con sufijo corto si ya existe.
    const base = slugify(`${titulo} ${getPartido(partido)!.nombre}`);
    slug = base;
    const { data: existe } = await admin.from("propiedades").select("id").eq("slug", slug).maybeSingle();
    if (existe) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;

    const { data, error } = await admin.from("propiedades").insert({ ...payload, slug }).select("id").single();
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, "crear", "propiedad", data.id, { titulo, partido });
    revalidarPortal(slug);
    return { ok: true, id: data.id };
  } catch (err) {
    return fail(err);
  }
}

export async function publicarPropiedadAction(id: string, publicado: boolean): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;
    const { data, error } = await admin.from("propiedades").update({ publicado }).eq("id", id).select("slug").single();
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, publicado ? "publicar" : "despublicar", "propiedad", id);
    revalidarPortal(data.slug);
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarPropiedadAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("propiedades").delete().eq("id", id);
    if (error) throw new Error(errorDb(error.message));
    await registrarActividad(actor, "eliminar", "propiedad", id);
    revalidarPortal();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
