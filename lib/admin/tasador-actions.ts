"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual, requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { PARTIDOS } from "@/lib/zonas";
import {
  CAMPOS_VALOR,
  ESTADOS_TASACION,
  mapTasacion,
  valoresDesdeFilas,
  type Comparable,
  type EstadoTasacion,
  type InformeTasacion,
  type Tasacion,
  type ValoresZona,
} from "@/lib/tasador";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  if (/tasaciones|tasador_valores|schema cache|does not exist/i.test(msg)) {
    return { ok: false, error: "Faltan las tablas del tasador (sql-tasador.sql) en Supabase." };
  }
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

const sitio = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
const refrescar = () => revalidatePath("/admin/tasador");

export type DocDeTasacion = { id: string; numero: string; estado: string };

export type DatosPanelTasador = {
  tasaciones: (Tasacion & { doc: DocDeTasacion | null })[];
  valores: Record<string, ValoresZona>;
  faltaTabla: boolean;
};

/** Pedidos del tasador (más nuevos primero) y valores por zona. faltaTabla = no se corrió sql-tasador.sql. */
export async function getDatosTasador(): Promise<DatosPanelTasador> {
  const vacio: DatosPanelTasador = { tasaciones: [], valores: valoresDesdeFilas(null), faltaTabla: false };
  const admin = await getSupabaseAdminClient();
  if (!admin) return vacio;
  // Este archivo es "use server": cualquiera podría invocarlo, así que se valida el rol.
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return vacio;

  const [tas, val] = await Promise.all([
    admin.from("tasaciones").select("*").order("creado_en", { ascending: false }).limit(500),
    admin.from("tasador_valores").select("*"),
  ]);
  if (tas.error) return { ...vacio, faltaTabla: true };

  const docIds = (tas.data ?? []).map((r) => r.doc_id).filter(Boolean) as string[];
  const docs = new Map<string, DocDeTasacion>();
  if (docIds.length) {
    const { data } = await admin.from("doc_emitidos").select("id, numero, estado").in("id", docIds);
    for (const d of data ?? []) docs.set(d.id as string, { id: d.id as string, numero: d.numero as string, estado: d.estado as string });
  }

  return {
    tasaciones: (tas.data ?? []).map((r) => ({ ...mapTasacion(r), doc: r.doc_id ? (docs.get(r.doc_id as string) ?? null) : null })),
    valores: valoresDesdeFilas(val.data),
    faltaTabla: false,
  };
}

/** Guarda los valores de referencia de un partido (USD/m² y USD/ha). */
export async function guardarValoresZonaAction(partido: string, valores: Record<string, number>): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    if (!PARTIDOS.some((p) => p.slug === partido)) throw new AdminActionError("Partido inválido.");
    const fila: Record<string, unknown> = { partido, actualizado_en: new Date().toISOString(), actualizado_por: perfil.email };
    for (const { campo, label } of CAMPOS_VALOR) {
      const n = Number(valores[campo]);
      if (!Number.isFinite(n) || n <= 0 || n > 10_000_000) throw new AdminActionError(`Revisá el valor de "${label}".`);
      fila[campo] = n;
    }
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("tasador_valores").upsert(fila, { onConflict: "partido" });
    if (error) throw error;
    await registrarActividad(perfil, "actualizar", "tasador_valores", null, fila);
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarTasacionAction(id: string, cambios: { estado?: EstadoTasacion; notas?: string }): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const fila: Record<string, string> = {};
    if (cambios.estado) {
      if (!ESTADOS_TASACION.some((e) => e.value === cambios.estado)) throw new AdminActionError("Estado inválido.");
      fila.estado = cambios.estado;
    }
    if (cambios.notas !== undefined) fila.notas = cambios.notas.slice(0, 4000);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("tasaciones").update(fila).eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "actualizar", "tasacion", id, fila);
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

function limpiarInforme(i: InformeTasacion): InformeTasacion {
  const num = (v: unknown, nombre: string) => {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) throw new AdminActionError(`Revisá el ${nombre}.`);
    return Math.round(n);
  };
  const minimo = num(i.minimo, "valor mínimo");
  const central = num(i.central, "valor central");
  const maximo = num(i.maximo, "valor máximo");
  if (!(minimo <= central && central <= maximo)) throw new AdminActionError("Los valores tienen que ir de menor a mayor: mínimo, central, máximo.");
  const comparables: Comparable[] = (i.comparables ?? [])
    .slice(0, 12)
    .map((c) => ({
      descripcion: String(c.descripcion ?? "").trim().slice(0, 200),
      fuente: String(c.fuente ?? "").trim().slice(0, 400),
      precio: Number(c.precio) || 0,
      superficie: Number(c.superficie) || 0,
    }))
    .filter((c) => c.descripcion && c.precio > 0);
  return {
    minimo,
    central,
    maximo,
    publicacion: num(i.publicacion, "precio de publicación"),
    comparables,
    observaciones: String(i.observaciones ?? "").trim().slice(0, 4000),
  };
}

/** Guarda el informe comparativo (valores finales, comparables y observaciones) sin enviarlo. */
export async function guardarInformeAction(id: string, informe: InformeTasacion): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const limpio = limpiarInforme(informe);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("tasaciones").update({ informe: limpio }).eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "actualizar", "tasacion_informe", id, { central: limpio.central });
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Aprueba el informe y devuelve el link privado para enviárselo al propietario. */
export async function aprobarInformeAction(id: string, informe: InformeTasacion): Promise<Resultado<{ link: string }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const limpio = limpiarInforme(informe);
    const admin = (await getSupabaseAdminClient())!;
    const { data: actual, error: errLeer } = await admin.from("tasaciones").select("informe_token, estado").eq("id", id).maybeSingle();
    if (errLeer) throw errLeer;
    if (!actual) throw new AdminActionError("No se encontró la tasación.");
    const token = (actual.informe_token as string | null) ?? randomBytes(24).toString("base64url");
    const fila: Record<string, unknown> = { informe: limpio, informe_token: token, informe_aprobado_en: new Date().toISOString() };
    if (actual.estado === "nuevo" || actual.estado === "contactado") fila.estado = "informe_enviado";
    const { error } = await admin.from("tasaciones").update(fila).eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "aprobar", "tasacion_informe", id, { central: limpio.central });
    refrescar();
    return { ok: true, link: `${sitio()}/tasador/informe/${token}` };
  } catch (err) {
    return fail(err);
  }
}

/** Da de baja el link del informe (el propietario deja de verlo). */
export async function retirarInformeAction(id: string): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("tasaciones").update({ informe_token: null, informe_aprobado_en: null }).eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "retirar", "tasacion_informe", id);
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarTasacionAction(id: string): Promise<Resultado> {
  try {
    const perfil = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { data: fila } = await admin.from("tasaciones").select("nombre").eq("id", id).maybeSingle();
    const { error } = await admin.from("tasaciones").delete().eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "eliminar", "tasacion", id, { nombre: fila?.nombre });
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
