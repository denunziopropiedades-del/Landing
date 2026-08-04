"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdminSession, AdminActionError } from "@/lib/admin/auth";

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

// ── Lotes ──────────────────────────────────────────────────────────────

export async function upsertLoteAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;

    const id = str(formData, "id");
    const payload = {
      nombre: str(formData, "nombre"),
      superficie_m2: num(formData, "superficieM2"),
      dimensiones: str(formData, "dimensiones"),
      precio_usd: num(formData, "precioUsd"),
      disponibles: num(formData, "disponibles"),
      destacado: formData.get("destacado") === "on",
      orden: num(formData, "orden") || 0,
    };

    const { error } = id
      ? await admin.from("lotes").update(payload).eq("id", id)
      : await admin.from("lotes").insert(payload);

    if (error) throw new Error(error.message);

    revalidatePath("/admin/lotes");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteLoteAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("lotes").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/lotes");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Contenido: promoción, financiación, textos del sitio ───────────────

export async function upsertPromocionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("promocion").upsert({
      id: 1,
      activa: formData.get("activa") === "on",
      titulo: str(formData, "titulo"),
      bajada: str(formData, "bajada"),
      fecha_fin: str(formData, "fechaFin"),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/contenido");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function upsertFinanciacionAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const cuotas = str(formData, "cuotasOpciones")
      .split(",")
      .map((c) => Number(c.trim()))
      .filter((c) => !Number.isNaN(c) && c > 0);

    const { error } = await admin.from("financiacion_config").upsert({
      id: 1,
      anticipo_minimo_pct: num(formData, "anticipoMinimoPct"),
      anticipo_maximo_pct: num(formData, "anticipoMaximoPct"),
      cuotas_opciones: cuotas,
      interes_anual_pct: num(formData, "interesAnualPct"),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/contenido");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function upsertTextosAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
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
    revalidatePath("/admin/contenido");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Galería ────────────────────────────────────────────────────────────

export async function addGaleriaItemAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("galeria").insert({
      categoria: str(formData, "categoria"),
      url: str(formData, "url"),
      titulo: str(formData, "titulo"),
    });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/galeria");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteGaleriaItemAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("galeria").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/galeria");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Testimonios ────────────────────────────────────────────────────────

export async function upsertTestimonioAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
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
    revalidatePath("/admin/testimonios");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteTestimonioAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("testimonios").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/testimonios");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Novedades ──────────────────────────────────────────────────────────

export async function upsertNovedadAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const id = str(formData, "id");
    const payload = {
      titulo: str(formData, "titulo"),
      contenido: str(formData, "contenido"),
      publicado: formData.get("publicado") === "on",
    };
    const { error } = id
      ? await admin.from("novedades").update(payload).eq("id", id)
      : await admin.from("novedades").insert(payload);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/novedades");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteNovedadAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("novedades").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/novedades");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Leads / consultas ──────────────────────────────────────────────────

export async function updateLeadEstadoAction(id: string, estado: string): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("leads").update({ estado }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("leads").delete().eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

// ── Proyectos ──────────────────────────────────────────────────────────

export async function addProyectoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const nombre = str(formData, "nombre");
    const slug = nombre
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const { error } = await admin.from("proyectos").insert({ nombre, slug, activo: true });
    if (error) throw new Error(error.message);
    revalidatePath("/admin/proyectos");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function toggleProyectoActivoAction(id: string, activo: boolean): Promise<ActionResult> {
  try {
    await requireAdminSession();
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("proyectos").update({ activo }).eq("id", id);
    if (error) throw new Error(error.message);
    revalidatePath("/admin/proyectos");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
