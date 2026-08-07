"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { cancelarEventoVisita } from "@/lib/google-calendar";
import type { EstadoLead, EstadoLote, EstadoVisita, Rol } from "@/types/site";

type ActionResult = { ok: true } | { ok: false; error: string };

function fail(err: unknown): ActionResult {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

function num(fd: FormData, key: string) {
  return Number(fd.get(key));
}

function str(fd: FormData, key: string) {
  return String(fd.get(key) ?? "").trim();
}

function optStr(fd: FormData, key: string) {
  const v = str(fd, key);
  return v.length > 0 ? v : null;
}

function slugify(texto: string) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ── Auth ───────────────────────────────────────────────────────────────

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email = str(formData, "email");
  const password = str(formData, "password");

  const supabase = await getSupabaseServerClient();
  if (!supabase) {
    return { ok: false as const, error: "Supabase no está configurado en este entorno." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false as const, error: "Email o contraseña incorrectos." };

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();
  redirect("/admin/login");
}

// ── Proyectos ──────────────────────────────────────────────────────────

export async function upsertProyectoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const id = str(formData, "id");
    const nombre = str(formData, "nombre");
    const payload = {
      nombre,
      slug: optStr(formData, "slug") ?? slugify(nombre),
      descripcion: str(formData, "descripcion"),
      ubicacion: str(formData, "ubicacion"),
      imagen_portada: optStr(formData, "imagenPortada"),
      whatsapp_numero: optStr(formData, "whatsappNumero"),
      destacado: formData.get("destacado") === "on",
    };

    if (id) {
      const { error } = await admin.from("proyectos").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await registrarActividad(actor, "actualizar", "proyecto", id, payload);
    } else {
      const { data, error } = await admin.from("proyectos").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await registrarActividad(actor, "crear", "proyecto", data.id, payload);
    }

    revalidatePath("/admin/proyectos");
    revalidatePath("/proyectos");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function publicarProyectoAction(id: string, publicado: boolean): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("proyectos").update({ publicado }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, publicado ? "publicar" : "despublicar", "proyecto", id);
    revalidatePath("/admin/proyectos");
    revalidatePath("/proyectos");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarProyectoAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("proyectos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "proyecto", id);
    revalidatePath("/admin/proyectos");
    revalidatePath("/proyectos");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Lotes ──────────────────────────────────────────────────────────────

type ImportResult = { ok: true; creadosOActualizados: number; filasConError: number } | { ok: false; error: string };

function parseSuperficie(dimensiones: string): number | null {
  const match = dimensiones.match(/(\d+(?:[.,]\d+)?)\s*[xX]\s*(\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const a = Number(match[1].replace(",", "."));
  const b = Number(match[2].replace(",", "."));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round(a * b);
}

export async function importarLotesExcelAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const proyectoId = str(formData, "proyectoId");
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, error: "Subí un archivo Excel (.xlsx) con el inventario." };
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await archivo.arrayBuffer());
    const hoja = workbook.worksheets[0];
    if (!hoja) return { ok: false, error: "El archivo no tiene ninguna hoja." };

    const filas: {
      proyecto_id: string;
      manzana: string;
      numero: string;
      superficie_m2: number;
      dimensiones: string;
      precio_usd: number;
      nombre: string;
    }[] = [];
    let filasConError = 0;

    hoja.eachRow((row, numeroFila) => {
      if (numeroFila === 1) return; // encabezado

      const manzana = String(row.getCell(1).value ?? "").trim();
      const numero = String(row.getCell(2).value ?? "").trim();
      const precioUsd = Number(row.getCell(3).value);
      const dimensiones = String(row.getCell(4).value ?? "").trim();

      if (!manzana && !numero) return; // fila vacía

      const superficieM2 = dimensiones ? parseSuperficie(dimensiones) : null;

      if (!manzana || !numero || !dimensiones || !Number.isFinite(precioUsd) || precioUsd <= 0 || !superficieM2) {
        filasConError += 1;
        return;
      }

      filas.push({
        proyecto_id: proyectoId,
        manzana,
        numero,
        superficie_m2: superficieM2,
        dimensiones,
        precio_usd: precioUsd,
        nombre: `Lote ${superficieM2} m²`,
      });
    });

    if (filas.length > 0) {
      const { error } = await admin.from("lotes").upsert(filas, { onConflict: "proyecto_id,manzana,numero" });
      if (error) throw new Error(error.message);
      await registrarActividad(actor, "importar", "lote", proyectoId, { cantidad: filas.length });
    }

    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true, creadosOActualizados: filas.length, filasConError };
  } catch (err) {
    return fail(err) as ImportResult;
  }
}

export async function upsertLoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const id = str(formData, "id");
    const proyectoId = str(formData, "proyectoId");
    const payload = {
      proyecto_id: proyectoId,
      nombre: str(formData, "nombre"),
      manzana: str(formData, "manzana"),
      numero: str(formData, "numero"),
      superficie_m2: num(formData, "superficieM2"),
      dimensiones: str(formData, "dimensiones"),
      precio_usd: num(formData, "precioUsd"),
      estado: str(formData, "estado") as EstadoLote,
      destacado: formData.get("destacado") === "on",
      pos_x: formData.get("posX") ? num(formData, "posX") : null,
      pos_y: formData.get("posY") ? num(formData, "posY") : null,
      anticipo_financiado_usd: formData.get("anticipoFinanciadoUsd") ? num(formData, "anticipoFinanciadoUsd") : null,
      cuotas_financiado: formData.get("cuotasFinanciado") ? num(formData, "cuotasFinanciado") : null,
      valor_cuota_financiado_usd: formData.get("valorCuotaFinanciadoUsd")
        ? num(formData, "valorCuotaFinanciadoUsd")
        : null,
    };

    if (id) {
      const { error } = await admin.from("lotes").update(payload).eq("id", id);
      if (error) throw new Error(error.message);
      await registrarActividad(actor, "actualizar", "lote", id, payload);
    } else {
      const { data, error } = await admin.from("lotes").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      await registrarActividad(actor, "crear", "lote", data.id, payload);
    }

    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarLoteAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("lotes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "lote", id);
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarLotesAction(ids: string[]): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("lotes").delete().in("id", ids);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar-masivo", "lote", null, { cantidad: ids.length });
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarPreciosMasivoAction(
  ids: string[],
  modo: "fijo" | "porcentaje",
  valor: number
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    if (modo === "fijo") {
      const { error } = await admin.from("lotes").update({ precio_usd: valor }).in("id", ids);
      if (error) throw new Error(error.message);
    } else {
      const { data, error: fetchError } = await admin.from("lotes").select("id, precio_usd").in("id", ids);
      if (fetchError) throw new Error(fetchError.message);

      const resultados = await Promise.all(
        (data ?? []).map((lote) => {
          const nuevoPrecio = Math.max(0, Math.round(Number(lote.precio_usd) * (1 + valor / 100)));
          return admin.from("lotes").update({ precio_usd: nuevoPrecio }).eq("id", lote.id);
        })
      );
      const conError = resultados.find((r) => r.error);
      if (conError?.error) throw new Error(conError.error.message);
    }

    await registrarActividad(actor, "actualizar-precio-masivo", "lote", null, { cantidad: ids.length, modo, valor });
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarEstadoLoteAction(id: string, estado: EstadoLote): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("lotes").update({ estado }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "cambiar-estado", "lote", id, { estado });
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Financiación ───────────────────────────────────────────────────────

export async function upsertFinanciacionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const proyectoId = str(formData, "proyectoId");
    const cuotas = str(formData, "cuotasOpciones")
      .split(",")
      .map((c) => Number(c.trim()))
      .filter((c) => !Number.isNaN(c) && c > 0);

    const { error } = await admin.from("financiacion_config").upsert(
      {
        proyecto_id: proyectoId,
        anticipo_minimo_pct: num(formData, "anticipoMinimoPct"),
        anticipo_maximo_pct: num(formData, "anticipoMaximoPct"),
        cuotas_opciones: cuotas,
        interes_anual_pct: num(formData, "interesAnualPct"),
      },
      { onConflict: "proyecto_id" }
    );
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "financiacion", proyectoId);
    revalidatePath("/admin/contenido");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Promociones ────────────────────────────────────────────────────────

export async function upsertPromocionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      proyecto_id: str(formData, "proyectoId"),
      activa: formData.get("activa") === "on",
      titulo: str(formData, "titulo"),
      bajada: str(formData, "bajada"),
      fecha_fin: str(formData, "fechaFin"),
    };

    const { error } = id
      ? await admin.from("promociones").update(payload).eq("id", id)
      : await admin.from("promociones").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, id ? "actualizar" : "crear", "promocion", id || null, payload);

    revalidatePath("/admin/contenido");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarPromocionAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("promociones").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "promocion", id);
    revalidatePath("/admin/contenido");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Textos globales del sitio ────────────────────────────────────────────

export async function upsertTextosAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("site_textos").upsert({
      id: 1,
      hero_titulo: str(formData, "heroTitulo"),
      hero_subtitulo: str(formData, "heroSubtitulo"),
      whatsapp_numero: str(formData, "whatsappNumero"),
      whatsapp_mensaje_default: str(formData, "whatsappMensajeDefault"),
      email: str(formData, "email"),
      instagram: str(formData, "instagram"),
      facebook: str(formData, "facebook"),
      youtube: str(formData, "youtube"),
    });
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "site_textos", "1");
    revalidatePath("/admin/contenido");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Banners ────────────────────────────────────────────────────────────

export async function upsertBannerAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      proyecto_id: optStr(formData, "proyectoId"),
      titulo: str(formData, "titulo"),
      imagen_url: str(formData, "imagenUrl"),
      link_url: optStr(formData, "linkUrl"),
      activo: formData.get("activo") === "on",
    };
    const { error } = id
      ? await admin.from("banners").update(payload).eq("id", id)
      : await admin.from("banners").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, id ? "actualizar" : "crear", "banner", id || null);
    revalidatePath("/admin/banners");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarBannerAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("banners").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "banner", id);
    revalidatePath("/admin/banners");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Galería ────────────────────────────────────────────────────────────

export async function addGaleriaItemAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const payload = {
      proyecto_id: str(formData, "proyectoId"),
      categoria: str(formData, "categoria"),
      url: str(formData, "url"),
      titulo: str(formData, "titulo"),
    };
    const { data, error } = await admin.from("galeria").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "crear", "galeria", data.id);
    revalidatePath("/admin/galeria");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteGaleriaItemAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("galeria").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "galeria", id);
    revalidatePath("/admin/galeria");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Progreso de desarrollo ───────────────────────────────────────────────

export async function upsertProgresoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      proyecto_id: str(formData, "proyectoId"),
      etapa: str(formData, "etapa"),
      porcentaje: num(formData, "porcentaje"),
    };
    const { error } = id
      ? await admin.from("progreso_desarrollo").update(payload).eq("id", id)
      : await admin.from("progreso_desarrollo").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, id ? "actualizar" : "crear", "progreso", id || null);
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarProgresoAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("progreso_desarrollo").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "progreso", id);
    revalidatePath("/admin/lotes");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Testimonios ────────────────────────────────────────────────────────

export async function upsertTestimonioAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      proyecto_id: optStr(formData, "proyectoId"),
      nombre: str(formData, "nombre"),
      ubicacion: str(formData, "ubicacion"),
      foto: str(formData, "foto"),
      comentario: str(formData, "comentario"),
      estrellas: num(formData, "estrellas") || 5,
    };
    const { error } = id
      ? await admin.from("testimonios").update(payload).eq("id", id)
      : await admin.from("testimonios").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, id ? "actualizar" : "crear", "testimonio", id || null);
    revalidatePath("/admin/testimonios");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTestimonioAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("testimonios").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "testimonio", id);
    revalidatePath("/admin/testimonios");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── FAQs ───────────────────────────────────────────────────────────────

export async function upsertFaqAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      proyecto_id: optStr(formData, "proyectoId"),
      pregunta: str(formData, "pregunta"),
      respuesta: str(formData, "respuesta"),
    };
    const { error } = id
      ? await admin.from("faqs").update(payload).eq("id", id)
      : await admin.from("faqs").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, id ? "actualizar" : "crear", "faq", id || null);
    revalidatePath("/admin/faqs");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarFaqAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("faqs").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "faq", id);
    revalidatePath("/admin/faqs");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Novedades ──────────────────────────────────────────────────────────

export async function upsertNovedadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      proyecto_id: optStr(formData, "proyectoId"),
      titulo: str(formData, "titulo"),
      contenido: str(formData, "contenido"),
      publicado: formData.get("publicado") === "on",
    };
    const { error } = id
      ? await admin.from("novedades").update(payload).eq("id", id)
      : await admin.from("novedades").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, id ? "actualizar" : "crear", "novedad", id || null);
    revalidatePath("/admin/novedades");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNovedadAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("novedades").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "novedad", id);
    revalidatePath("/admin/novedades");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── CRM: leads y visitas ─────────────────────────────────────────────────

async function verificarPropiedadLead(actorId: string, actorRol: Rol, leadId: string) {
  if (actorRol !== "vendedor") return;
  const admin = (await getSupabaseAdminClient())!;
  const { data } = await admin.from("leads").select("asignado_a").eq("id", leadId).maybeSingle();
  if (data?.asignado_a && data.asignado_a !== actorId) {
    throw new AdminActionError("No podés modificar un lead asignado a otro vendedor.");
  }
}

export async function crearLeadManualAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;

    const nombre = str(formData, "nombre");
    if (!nombre) throw new Error("El nombre es obligatorio.");

    const loteId = optStr(formData, "loteId");
    let manzana: string | null = null;
    if (loteId) {
      const { data: lote } = await admin.from("lotes").select("manzana").eq("id", loteId).maybeSingle();
      manzana = lote?.manzana ?? null;
    }

    const payload = {
      tipo: "manual" as const,
      proyecto_id: optStr(formData, "proyectoId"),
      lote_id: loteId,
      manzana,
      nombre,
      apellido: optStr(formData, "apellido"),
      dni: optStr(formData, "dni"),
      email: optStr(formData, "email") ?? "",
      telefono: optStr(formData, "telefono") ?? "",
      observaciones: optStr(formData, "observaciones") ?? "",
      estado: "nuevo" as const,
      asignado_a: actor.rol === "vendedor" ? actor.id : optStr(formData, "asignadoA"),
    };

    const { data, error } = await admin.from("leads").insert(payload).select("id").single();
    if (error) throw new Error(error.message);

    await registrarActividad(actor, "crear", "lead", data.id, { origen: "manual" });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarEstadoLeadAction(id: string, estado: EstadoLead): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;

    const { data: lead, error: errLead } = await admin.from("leads").select("lote_id").eq("id", id).maybeSingle();
    if (errLead) throw new Error(errLead.message);

    const { error } = await admin
      .from("leads")
      .update({ estado, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);

    if (lead?.lote_id) {
      if (estado === "reservado") {
        await admin.from("lotes").update({ estado: "reservado" }).eq("id", lead.lote_id);
      } else if (estado === "vendido") {
        await admin.from("lotes").update({ estado: "vendido" }).eq("id", lead.lote_id);
      } else if (estado === "descartado") {
        await admin.from("lotes").update({ estado: "disponible" }).eq("id", lead.lote_id).eq("estado", "reservado");
      }
    }

    await registrarActividad(actor, "cambiar-estado", "lead", id, { estado });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    revalidatePath("/admin/lotes");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarObservacionesLeadAction(id: string, observaciones: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin
      .from("leads")
      .update({ observaciones, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "anotar", "lead", id);
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarFechaNacimientoLeadAction(id: string, fecha: string | null): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin
      .from("leads")
      .update({ fecha_nacimiento: fecha, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "lead", id, { fechaNacimiento: fecha });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function asignarLeadAction(id: string, vendedorId: string | null): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("leads").update({ asignado_a: vendedorId }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "asignar", "lead", id, { vendedorId });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cambiarProyectoLeadAction(id: string, proyectoId: string | null): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const [{ data: actual }, { data: nuevo }] = await Promise.all([
      admin.from("leads").select("proyectos(nombre)").eq("id", id).maybeSingle(),
      proyectoId
        ? admin.from("proyectos").select("nombre").eq("id", proyectoId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const { error } = await admin
      .from("leads")
      .update({ proyecto_id: proyectoId, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);

    await registrarActividad(actor, "cambiar-proyecto", "lead", id, {
      anterior: (actual?.proyectos as unknown as { nombre: string } | null)?.nombre ?? "Sin desarrollo",
      nuevo: nuevo?.nombre ?? "Sin desarrollo",
    });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cambiarProyectoVisitaAction(id: string, proyectoId: string | null): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;

    const [{ data: actual }, { data: nuevo }] = await Promise.all([
      admin.from("visitas").select("proyectos(nombre)").eq("id", id).maybeSingle(),
      proyectoId
        ? admin.from("proyectos").select("nombre").eq("id", proyectoId).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const { error } = await admin.from("visitas").update({ proyecto_id: proyectoId }).eq("id", id);
    if (error) throw new Error(error.message);

    await registrarActividad(actor, "cambiar-proyecto", "visita", id, {
      anterior: (actual?.proyectos as unknown as { nombre: string } | null)?.nombre ?? "Sin desarrollo",
      nuevo: nuevo?.nombre ?? "Sin desarrollo",
    });
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "lead", id);
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarEstadoVisitaAction(id: string, estado: EstadoVisita): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;

    if (estado === "cancelada") {
      const { data: visita } = await admin.from("visitas").select("google_event_id").eq("id", id).maybeSingle();
      if (visita?.google_event_id) await cancelarEventoVisita(visita.google_event_id);
    }

    const { error } = await admin.from("visitas").update({ estado }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "cambiar-estado", "visita", id, { estado });
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarVisitaAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const { data: visita } = await admin.from("visitas").select("google_event_id").eq("id", id).maybeSingle();
    if (visita?.google_event_id) await cancelarEventoVisita(visita.google_event_id);

    const { error } = await admin.from("visitas").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "visita", id);
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Usuarios y roles ─────────────────────────────────────────────────────

export async function invitarUsuarioAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const email = str(formData, "email");
    const nombre = str(formData, "nombre");
    const rol = str(formData, "rol") as Rol;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.matulotes.com.ar";
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre },
      redirectTo: `${siteUrl}/admin/login`,
    });
    if (error) throw new Error(error.message);

    if (data.user) {
      await admin.from("perfiles").update({ rol, nombre }).eq("id", data.user.id);
    }

    await registrarActividad(actor, "invitar", "usuario", data.user?.id ?? null, { email, rol });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function cambiarRolUsuarioAction(id: string, rol: Rol): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("perfiles").update({ rol }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "cambiar-rol", "usuario", id, { rol });
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleActivoUsuarioAction(id: string, activo: boolean): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("perfiles").update({ activo }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, activo ? "activar" : "desactivar", "usuario", id);
    revalidatePath("/admin/usuarios");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
