"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { cancelarEventoVisita, crearEventoEscribania } from "@/lib/google-calendar";
import { NOTA_RESERVA_LOTE_HTML, sendEmail } from "@/lib/email";
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

// Convierte un link normal de YouTube o TikTok al formato "embed" que hace falta para
// mostrarlo en un iframe dentro de la galería. Si no es de ninguno de los dos, lo deja igual.
async function normalizarUrlVideo(url: string): Promise<string> {
  const yt = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;

  let urlTiktok = url;
  if (/vm\.tiktok\.com|vt\.tiktok\.com|tiktok\.com\/t\//.test(url)) {
    // Los links cortos que copia la app de TikTok redirigen a la URL completa con el ID del video.
    try {
      const res = await fetch(url, { redirect: "follow" });
      urlTiktok = res.url;
    } catch {
      // Si falla la resolución del link corto, seguimos con la URL original.
    }
  }
  const tk = urlTiktok.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
  if (tk) return `https://www.tiktok.com/embed/v2/${tk[1]}`;

  return url;
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
      ubicacion_maps_url: optStr(formData, "ubicacionMapsUrl"),
      meta_descripcion: optStr(formData, "metaDescripcion"),
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

const ESTADOS_LOTE_VALIDOS = new Set(["disponible", "reservado", "vendido", "no_disponible"]);

export async function actualizarEstadosLotesAction(_prev: ImportResult | null, formData: FormData): Promise<ImportResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const proyectoId = str(formData, "proyectoId");
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return {
        ok: false,
        error: "Subí un archivo Excel (.xlsx) con las columnas Manzana, Numero, Estado, PosX, PosY.",
      };
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await archivo.arrayBuffer());
    const hoja = workbook.worksheets[0];
    if (!hoja) return { ok: false, error: "El archivo no tiene ninguna hoja." };

    const filas: { manzana: string; numero: string; estado: string; posX: number | null; posY: number | null }[] = [];
    let filasConError = 0;

    hoja.eachRow((row, numeroFila) => {
      if (numeroFila === 1) return; // encabezado

      const manzana = String(row.getCell(1).value ?? "").trim();
      const numero = String(row.getCell(2).value ?? "").trim();
      const estado = String(row.getCell(3).value ?? "")
        .trim()
        .toLowerCase();
      const posXRaw = row.getCell(4).value;
      const posYRaw = row.getCell(5).value;
      const posX = posXRaw === null || posXRaw === undefined || posXRaw === "" ? null : Number(posXRaw);
      const posY = posYRaw === null || posYRaw === undefined || posYRaw === "" ? null : Number(posYRaw);

      if (!manzana && !numero) return; // fila vacía

      if (!manzana || !numero || !ESTADOS_LOTE_VALIDOS.has(estado)) {
        filasConError += 1;
        return;
      }

      filas.push({
        manzana,
        numero,
        estado,
        posX: Number.isFinite(posX) ? posX : null,
        posY: Number.isFinite(posY) ? posY : null,
      });
    });

    let actualizados = 0;
    for (const fila of filas) {
      const payload: Record<string, unknown> = { estado: fila.estado };
      if (fila.posX !== null) payload.pos_x = fila.posX;
      if (fila.posY !== null) payload.pos_y = fila.posY;

      const { error, count } = await admin
        .from("lotes")
        .update(payload, { count: "exact" })
        .eq("proyecto_id", proyectoId)
        .eq("manzana", fila.manzana)
        .eq("numero", fila.numero);
      if (error) throw new Error(error.message);
      if (count) actualizados += count;
      else filasConError += 1;
    }

    await registrarActividad(actor, "actualizar-estados", "lote", proyectoId, { cantidad: actualizados });
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true, creadosOActualizados: actualizados, filasConError };
  } catch (err) {
    return fail(err) as ImportResult;
  }
}

// ── Importar leads de Meta Ads desde CSV ──────────────────────────────

type ImportLeadsResult =
  | { ok: true; creados: number; duplicados: number; filasConError: number }
  | { ok: false; error: string };

// Meta exporta el CSV de "Formularios de Clientes potenciales" en UTF-16 (con BOM) y separado por tabs,
// con columnas fijas (id, created_time, ad_id, ...) seguidas de las preguntas propias de cada formulario.
function decodificarCsvMeta(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const esUtf16Le = bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe;
  const esUtf16Be = bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff;
  if (esUtf16Le) return new TextDecoder("utf-16le").decode(buffer);
  if (esUtf16Be) return new TextDecoder("utf-16be").decode(buffer);
  return new TextDecoder("utf-8").decode(buffer);
}

function parseLineaCsv(linea: string): string[] {
  return linea.split("\t").map((celda) => {
    const limpia = celda.trim();
    if (limpia.startsWith('"') && limpia.endsWith('"')) {
      return limpia.slice(1, -1).replace(/""/g, '"').trim();
    }
    return limpia;
  });
}

function humanizarPregunta(header: string): string {
  return header
    .replace(/^¿?/, "")
    .replace(/\?$/, "")
    .replace(/_/g, " ")
    .trim();
}

export async function importarLeadsMetaCsvAction(
  _prev: ImportLeadsResult | null,
  formData: FormData
): Promise<ImportLeadsResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const proyectoId = optStr(formData, "proyectoId");
    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
      return { ok: false, error: "Subí el archivo CSV que exportaste desde Meta Ads (Administrador de anuncios)." };
    }

    const texto = decodificarCsvMeta(await archivo.arrayBuffer());
    const lineas = texto.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lineas.length < 2) {
      return { ok: false, error: "El archivo no tiene filas de leads." };
    }

    const encabezados = parseLineaCsv(lineas[0]).map((h) => h.toLowerCase());
    const idxId = encabezados.findIndex((h) => h === "id");
    const idxCreado = encabezados.findIndex((h) => h === "created_time");
    const idxEmail = encabezados.findIndex((h) => h === "email");
    const idxTelefono = encabezados.findIndex((h) => h.includes("phone"));
    const idxCiudad = encabezados.findIndex((h) => h === "city");
    const idxCampana = encabezados.findIndex((h) => h === "campaign_name");
    const idxFormulario = encabezados.findIndex((h) => h === "form_name");
    const idxPlataforma = encabezados.findIndex((h) => h === "platform");
    const idxNombre = encabezados.findIndex((h) => h.includes("nombre") || h === "full_name");
    const idxPreguntas = encabezados
      .map((h, i) => ({ h, i }))
      .filter(({ h, i }) => h.includes("?") && i !== idxNombre);

    if (idxId === -1 || idxEmail === -1 || idxTelefono === -1) {
      return {
        ok: false,
        error: "El CSV no tiene el formato esperado de Meta (faltan columnas id, email o phone_number).",
      };
    }

    type FilaLead = {
      external_id: string;
      creado_en: string | undefined;
      nombre: string;
      email: string;
      telefono: string;
      observaciones: string;
    };

    const filas: FilaLead[] = [];
    let filasConError = 0;

    for (const linea of lineas.slice(1)) {
      const celdas = parseLineaCsv(linea);
      const idRaw = celdas[idxId]?.trim();
      const email = celdas[idxEmail]?.trim() ?? "";
      const telefonoRaw = celdas[idxTelefono]?.trim() ?? "";
      const telefono = telefonoRaw.replace(/^p:/, "");
      const nombre = (idxNombre !== -1 ? celdas[idxNombre]?.trim() : "") || "Consulta de Meta Ads";

      if (!idRaw || (!email && !telefono)) {
        filasConError += 1;
        continue;
      }

      const externalId = idRaw.replace(/^l:/, "");
      const creadoRaw = idxCreado !== -1 ? celdas[idxCreado]?.trim() : undefined;
      const creadoEn = creadoRaw && !Number.isNaN(Date.parse(creadoRaw)) ? new Date(creadoRaw).toISOString() : undefined;

      const detalles: string[] = [];
      if (idxCampana !== -1 && celdas[idxCampana]) detalles.push(`Campaña: ${celdas[idxCampana]}`);
      if (idxFormulario !== -1 && celdas[idxFormulario]) detalles.push(`Formulario: ${celdas[idxFormulario]}`);
      if (idxPlataforma !== -1 && celdas[idxPlataforma]) detalles.push(`Plataforma: ${celdas[idxPlataforma]}`);
      if (idxCiudad !== -1 && celdas[idxCiudad]) detalles.push(`Ciudad: ${celdas[idxCiudad]}`);
      for (const { h, i } of idxPreguntas) {
        if (celdas[i]) detalles.push(`${humanizarPregunta(h)}: ${celdas[i].replace(/_/g, " ")}`);
      }

      filas.push({
        external_id: externalId,
        creado_en: creadoEn,
        nombre,
        email: email || "sin-email@matulotes.app",
        telefono: telefono || "-",
        observaciones: ["Lead importado desde CSV de Meta Ads (Facebook/Instagram).", ...detalles].join("\n"),
      });
    }

    if (filas.length === 0) {
      return { ok: false, error: "No se encontró ninguna fila válida para importar." };
    }

    const idsDelLote = filas.map((f) => f.external_id);
    const { data: existentes } = await admin.from("leads").select("external_id").in("external_id", idsDelLote);
    const idsExistentes = new Set((existentes ?? []).map((e) => e.external_id));

    const nuevas = filas.filter((f) => !idsExistentes.has(f.external_id));
    const duplicados = filas.length - nuevas.length;

    if (nuevas.length > 0) {
      const payload = nuevas.map((f) => ({
        tipo: "meta" as const,
        external_id: f.external_id,
        ...(f.creado_en ? { creado_en: f.creado_en } : {}),
        proyecto_id: proyectoId,
        nombre: f.nombre,
        email: f.email,
        telefono: f.telefono,
        estado: "nuevo" as const,
        observaciones: f.observaciones,
      }));
      const { error } = await admin.from("leads").insert(payload);
      if (error) throw new Error(error.message);
      await registrarActividad(actor, "importar-csv", "lead", null, { cantidad: nuevas.length });
    }

    revalidatePath("/admin/crm");
    revalidatePath("/admin");
    return { ok: true, creados: nuevas.length, duplicados, filasConError };
  } catch (err) {
    return fail(err) as ImportLeadsResult;
  }
}

export type CalibracionPlano = {
  xMin: number;
  xMax: number;
  bandas: { yTop: number; yBottom: number }[]; // una por manzana, en el orden en que aparecen ordenadas
  celdaAnchoPct: number;
  celdaAltoPct: number;
};

/**
 * Recalcula pos_x/pos_y de todos los lotes de un proyecto asumiendo la grilla de
 * Ayres de Guernica: cada manzana tiene 102 lotes en 2 filas de 51 (fila de arriba
 * numerada 1→51 de izquierda a derecha, fila de abajo numerada 102→52 de izquierda
 * a derecha). Sirve para calibrar visualmente contra la imagen real del masterplan.
 */
export async function recalcularPosicionesLotesAction(
  proyectoId: string,
  calibracion: CalibracionPlano
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const { data: lotes, error: errLotes } = await admin
      .from("lotes")
      .select("id, manzana, numero")
      .eq("proyecto_id", proyectoId);
    if (errLotes) throw new Error(errLotes.message);
    if (!lotes || lotes.length === 0) return { ok: false, error: "Este proyecto no tiene lotes cargados." };

    const manzanasOrdenadas = Array.from(new Set(lotes.map((l) => l.manzana))).sort();
    const { xMin, xMax, bandas, celdaAnchoPct, celdaAltoPct } = calibracion;
    const colWidth = (xMax - xMin) / 51;

    const actualizaciones = lotes
      .map((lote) => {
        const bandaIdx = manzanasOrdenadas.indexOf(lote.manzana);
        const banda = bandas[bandaIdx];
        if (!banda) return null;

        const numero = Number(lote.numero);
        const esFilaSuperior = numero >= 1 && numero <= 51;
        const posicion = esFilaSuperior ? numero : 103 - numero;
        const posX = Math.round((xMin + (posicion - 0.5) * colWidth) * 10) / 10;
        const posY = esFilaSuperior ? banda.yTop : banda.yBottom;

        return { id: lote.id, pos_x: posX, pos_y: posY };
      })
      .filter((v): v is { id: string; pos_x: number; pos_y: number } => v !== null);

    for (const act of actualizaciones) {
      const { error } = await admin.from("lotes").update({ pos_x: act.pos_x, pos_y: act.pos_y }).eq("id", act.id);
      if (error) throw new Error(error.message);
    }

    const { error: errProyecto } = await admin
      .from("proyectos")
      .update({ celda_ancho_pct: celdaAnchoPct, celda_alto_pct: celdaAltoPct })
      .eq("id", proyectoId);
    if (errProyecto) throw new Error(errProyecto.message);

    await registrarActividad(actor, "calibrar-plano", "proyecto", proyectoId, { cantidad: actualizaciones.length });
    revalidatePath("/admin/lotes");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
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

/**
 * Actualiza precio (y opcionalmente el plan de financiación fijo) de TODOS los
 * lotes de un proyecto que compartan la misma medida (ej. "10 x 30"), en vez de
 * tener que editar lote por lote. De paso, normaliza el nombre para que todos
 * queden agrupados en una sola tarjeta comercial en el sitio público.
 */
export async function actualizarPrecioPorMedidaAction(
  proyectoId: string,
  dimensiones: string,
  precioUsd: string,
  anticipoUsd: string,
  cuotas: string,
  valorCuotaUsd: string
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const precio = Number(precioUsd);
    if (!dimensiones.trim() || !Number.isFinite(precio) || precio <= 0) {
      return { ok: false, error: "Falta la medida o el precio no es válido." };
    }
    const superficieM2 = parseSuperficie(dimensiones);

    const payload: Record<string, unknown> = { precio_usd: precio };
    if (superficieM2) payload.nombre = `Lote ${superficieM2} m²`;
    payload.anticipo_financiado_usd = anticipoUsd.trim() ? Number(anticipoUsd) : null;
    payload.cuotas_financiado = cuotas.trim() ? Number(cuotas) : null;
    payload.valor_cuota_financiado_usd = valorCuotaUsd.trim() ? Number(valorCuotaUsd) : null;

    const { error, count } = await admin
      .from("lotes")
      .update(payload, { count: "exact" })
      .eq("proyecto_id", proyectoId)
      .eq("dimensiones", dimensiones);
    if (error) throw new Error(error.message);

    await registrarActividad(actor, "actualizar-precio-medida", "lote", proyectoId, { dimensiones, ...payload, cantidad: count });
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

export async function actualizarEstadoLotesMasivoAction(ids: string[], estado: EstadoLote): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("lotes").update({ estado }).in("id", ids);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar-estado-masivo", "lote", null, { cantidad: ids.length, estado });
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

    // Todos los campos son opcionales: cada proyecto puede tener su plan fijo de
    // anticipo/cuotas por medida de lote en vez de esta calculadora por porcentaje.
    // Un campo vacío deja el valor existente sin tocar (o el default de la tabla
    // si el proyecto todavía no tenía fila).
    const payload: Record<string, unknown> = { proyecto_id: proyectoId };
    if (optStr(formData, "anticipoMinimoPct")) payload.anticipo_minimo_pct = num(formData, "anticipoMinimoPct");
    if (optStr(formData, "anticipoMaximoPct")) payload.anticipo_maximo_pct = num(formData, "anticipoMaximoPct");
    if (optStr(formData, "interesAnualPct")) payload.interes_anual_pct = num(formData, "interesAnualPct");
    const cuotasStr = optStr(formData, "cuotasOpciones");
    if (cuotasStr) {
      const cuotas = cuotasStr
        .split(",")
        .map((c) => Number(c.trim()))
        .filter((c) => !Number.isNaN(c) && c > 0);
      if (cuotas.length > 0) payload.cuotas_opciones = cuotas;
    }

    const { error } = await admin.from("financiacion_config").upsert(payload, { onConflict: "proyecto_id" });
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "financiacion", proyectoId);
    revalidatePath("/admin/contenido");
    revalidatePath("/proyectos/[slug]", "page");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function upsertComboLotesAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const proyectoId = str(formData, "proyectoId");

    const { error } = await admin.from("combos_lotes").upsert(
      {
        proyecto_id: proyectoId,
        label_1_lote: str(formData, "label1Lote") || "1 lote",
        precio_1_lote_usd: formData.get("precio1LoteUsd") ? num(formData, "precio1LoteUsd") : null,
        label_2_lotes: str(formData, "label2Lotes") || "2 lotes juntos",
        precio_2_lotes_usd: formData.get("precio2LotesUsd") ? num(formData, "precio2LotesUsd") : null,
        label_3_lotes: str(formData, "label3Lotes") || "3 lotes juntos",
        precio_3_lotes_usd: formData.get("precio3LotesUsd") ? num(formData, "precio3LotesUsd") : null,
        beneficio_1: optStr(formData, "beneficio1"),
        beneficio_2: optStr(formData, "beneficio2"),
        beneficio_3: optStr(formData, "beneficio3"),
      },
      { onConflict: "proyecto_id" }
    );
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "combos-lotes", proyectoId);
    revalidatePath("/admin/lotes");
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
      telefono_oficina: str(formData, "telefonoOficina"),
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
    const categoria = str(formData, "categoria");
    const urlIngresada = str(formData, "url");
    const payload = {
      proyecto_id: str(formData, "proyectoId"),
      categoria,
      url: categoria === "videos" ? await normalizarUrlVideo(urlIngresada) : urlIngresada,
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

export async function addGaleriaItemsMasivoAction(
  items: { categoria: string; titulo: string; url: string }[],
  proyectoId: string
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    if (items.length === 0) return { ok: true };

    const payload = items.map((item) => ({
      proyecto_id: proyectoId,
      categoria: item.categoria,
      titulo: item.titulo,
      url: item.url,
    }));
    const { error } = await admin.from("galeria").insert(payload);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "crear-masivo", "galeria", proyectoId, { cantidad: items.length });
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

    const { data: lead, error: errLead } = await admin
      .from("leads")
      .select("lote_id, lead_lotes(lote_id)")
      .eq("id", id)
      .maybeSingle();
    if (errLead) throw new Error(errLead.message);

    const { error } = await admin
      .from("leads")
      .update({ estado, actualizado_en: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") {
        throw new Error("Ese lote ya está reservado o vendido por otro cliente. No se puede duplicar.");
      }
      throw new Error(error.message);
    }

    const loteIdsDelLead = Array.from(
      new Set([
        ...((lead?.lead_lotes ?? []) as unknown as { lote_id: string }[]).map((ll) => ll.lote_id),
        ...(lead?.lote_id ? [lead.lote_id] : []),
      ])
    );

    if (loteIdsDelLead.length > 0) {
      if (estado === "reservado") {
        await admin.from("lotes").update({ estado: "reservado" }).in("id", loteIdsDelLead);
      } else if (estado === "vendido") {
        await admin.from("lotes").update({ estado: "vendido" }).in("id", loteIdsDelLead);
      } else if (estado === "descartado") {
        await admin.from("lotes").update({ estado: "disponible" }).in("id", loteIdsDelLead).eq("estado", "reservado");
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

export async function actualizarPagoLeadAction(
  id: string,
  numeroTransaccion: string,
  importeCobrado: string
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;
    const importe = importeCobrado.trim() ? Number(importeCobrado) : null;
    const { error } = await admin
      .from("leads")
      .update({
        numero_transaccion: numeroTransaccion.trim() || null,
        importe_cobrado: importe,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "lead", id, { numeroTransaccion, importeCobrado: importe });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarComisionHonorariosLeadAction(
  id: string,
  comisionUsd: string,
  honorariosUsd: string,
  honorariosArs: string,
  gastosArs: string
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;
    const comision = comisionUsd.trim() ? Number(comisionUsd) : null;
    const honorariosU = honorariosUsd.trim() ? Number(honorariosUsd) : null;
    const honorariosA = honorariosArs.trim() ? Number(honorariosArs) : null;
    const gastosA = gastosArs.trim() ? Number(gastosArs) : null;
    const { error } = await admin
      .from("leads")
      .update({
        comision_usd: comision,
        honorarios_usd: honorariosU,
        honorarios_ars: honorariosA,
        gastos_ars: gastosA,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "lead", id, {
      comisionUsd: comision,
      honorariosUsd: honorariosU,
      honorariosArs: honorariosA,
      gastosArs: gastosA,
    });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/facturacion");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarFirmaEscribaniaLeadAction(
  id: string,
  fecha: string,
  horario: string
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;

    const { data: lead } = await admin
      .from("leads")
      .select("nombre, apellido, manzana, escribania_calendar_event_id, lotes(manzana, numero), proyectos(nombre)")
      .eq("id", id)
      .maybeSingle();

    // Si ya había un evento cargado (fecha/horario anteriores), se borra: al guardar de nuevo
    // se crea uno nuevo con los datos actualizados, así nunca queda un evento viejo duplicado.
    if (lead?.escribania_calendar_event_id) {
      await cancelarEventoVisita(lead.escribania_calendar_event_id);
    }

    const fechaLimpia = fecha || "";
    const horarioLimpio = horario.trim();
    let eventId: string | null = null;
    if (fechaLimpia && horarioLimpio && lead) {
      const lote = lead.lotes as unknown as { manzana: string; numero: string } | null;
      eventId = await crearEventoEscribania({
        nombreCliente: `${lead.nombre} ${lead.apellido ?? ""}`.trim(),
        fecha: fechaLimpia,
        horario: horarioLimpio,
        manzana: lote?.manzana ?? lead.manzana ?? undefined,
        lote: lote?.numero ?? undefined,
        proyectoNombre: (lead.proyectos as unknown as { nombre: string } | null)?.nombre,
      });
    }

    const { error } = await admin
      .from("leads")
      .update({
        fecha_firma_escribania: fechaLimpia || null,
        horario_firma_escribania: horarioLimpio || null,
        escribania_calendar_event_id: eventId,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "lead", id, { fechaFirmaEscribania: fecha, horarioFirmaEscribania: horario });
    revalidatePath("/admin/crm");
    revalidatePath("/admin/consultas");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarSexoLeadAction(id: string, sexo: "M" | "F" | null): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    await verificarPropiedadLead(actor.id, actor.rol, id);
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("leads").update({ sexo, actualizado_en: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "lead", id, { sexo });
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

const ESTADO_VISITA_MENSAJE: Record<EstadoVisita, { asunto: string; titulo: string; cuerpo: string }> = {
  pendiente: {
    asunto: "Tu visita está pendiente de confirmación",
    titulo: "Tu visita está pendiente de confirmación",
    cuerpo: "En breve nos pondremos en contacto para confirmar el horario.",
  },
  confirmada: {
    asunto: "¡Tu visita fue confirmada!",
    titulo: "¡Tu visita fue confirmada!",
    cuerpo: "Te esperamos en la fecha y horario coordinados.",
  },
  cancelada: {
    asunto: "Tu visita fue cancelada",
    titulo: "Tu visita fue cancelada",
    cuerpo: "Si querés coordinar un nuevo horario, escribinos por WhatsApp o volvé a agendar desde la web.",
  },
  realizada: {
    asunto: "¡Gracias por tu visita!",
    titulo: "¡Gracias por tu visita!",
    cuerpo:
      "Esperamos que te haya gustado el lote. Cualquier consulta, o si querés avanzar con la reserva, estamos a disposición.",
  },
};

export async function actualizarEstadoVisitaAction(id: string, estado: EstadoVisita): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor", "vendedor");
    const admin = (await getSupabaseAdminClient())!;

    const { data: visita } = await admin
      .from("visitas")
      .select("google_event_id, email, nombre, fecha, horario, proyectos(nombre, ubicacion_maps_url)")
      .eq("id", id)
      .maybeSingle();

    if (estado === "cancelada" && visita?.google_event_id) {
      await cancelarEventoVisita(visita.google_event_id);
    }

    const { error } = await admin.from("visitas").update({ estado }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "cambiar-estado", "visita", id, { estado });

    if (visita?.email) {
      try {
        const proyecto = visita.proyectos as unknown as { nombre: string; ubicacion_maps_url: string | null } | null;
        const mensaje = ESTADO_VISITA_MENSAJE[estado];
        await sendEmail(
          visita.email,
          mensaje.asunto,
          `<h2>${mensaje.titulo}</h2>
           <p>Hola ${visita.nombre}, te contamos que tu visita${proyecto?.nombre ? ` a <b>${proyecto.nombre}</b>` : ""} cambió de estado:</p>
           <ul>
             <li><b>Fecha:</b> ${visita.fecha}</li>
             <li><b>Horario:</b> ${visita.horario}</li>
             <li><b>Estado:</b> ${estado}</li>
           </ul>
           <p>${mensaje.cuerpo}</p>
           ${
             estado === "confirmada" && proyecto?.ubicacion_maps_url
               ? `<div style="margin: 12px 0; padding: 10px 14px; border: 2px solid #16a34a; border-radius: 8px; background: #f0fdf4; display: inline-block;">
                    <b>Ubicación:</b> <a href="${proyecto.ubicacion_maps_url}" target="_blank" rel="noopener noreferrer" style="color: #16a34a; font-weight: 600;">${proyecto.ubicacion_maps_url}</a>
                  </div>`
               : ""
           }
           ${estado === "realizada" ? NOTA_RESERVA_LOTE_HTML : ""}`
        );
      } catch (err) {
        console.error("No se pudo enviar el email de cambio de estado de la visita", err);
      }
    }

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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app";
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

export async function actualizarNombreUsuarioAction(id: string, nombre: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("perfiles").update({ nombre: nombre.trim() || null }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "usuario", id, { nombre });
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

// ── Facturación (gastos) ──────────────────────────────────────────────

export async function crearGastoAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const payload = {
      proyecto_id: optStr(formData, "proyectoId"),
      fecha: str(formData, "fecha"),
      concepto: str(formData, "concepto"),
      categoria: optStr(formData, "categoria"),
      monto_ars: Number(str(formData, "montoArs")),
    };
    if (!payload.fecha || !payload.concepto || !Number.isFinite(payload.monto_ars) || payload.monto_ars <= 0) {
      return { ok: false, error: "Completá fecha, concepto y un monto válido." };
    }

    const { data, error } = await admin.from("gastos").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "crear", "gasto", data.id, payload);
    revalidatePath("/admin/facturacion");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarGastoAction(
  id: string,
  fecha: string,
  concepto: string,
  categoria: string,
  montoArs: string
): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;

    const monto = Number(montoArs);
    if (!fecha || !concepto.trim() || !Number.isFinite(monto) || monto <= 0) {
      return { ok: false, error: "Completá fecha, concepto y un monto válido." };
    }

    const { error } = await admin
      .from("gastos")
      .update({ fecha, concepto: concepto.trim(), categoria: categoria.trim() || null, monto_ars: monto })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "gasto", id, { fecha, concepto, categoria, montoArs: monto });
    revalidatePath("/admin/facturacion");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarGastoAction(id: string): Promise<ActionResult> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const { error } = await admin.from("gastos").delete().eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "gasto", id);
    revalidatePath("/admin/facturacion");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
