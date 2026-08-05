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

// ── Usuarios y roles ─────────────────────────────────────────────────────

export async function invitarUsuarioAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const email = str(formData, "email");
    const nombre = str(formData, "nombre");
    const rol = str(formData, "rol") as Rol;

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nombre },
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
