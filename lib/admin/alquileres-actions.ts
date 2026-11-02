"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { AdminActionError, getPerfilActual, requireRole } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { cargarAlquileres, type DatosAlquileres } from "@/lib/alquileres-server";
import { crearLinkPagoAlquiler, isMercadoPagoConfigured } from "@/lib/mercadopago";
import { hoyIso, mapContrato, mapCuota, nombrePeriodo, punitoriosCalculados, totalCuota } from "@/lib/alquileres";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  if (/alq_|schema cache|does not exist/i.test(msg)) {
    return { ok: false, error: "Falta crear las tablas de alquileres (sql-alquileres.sql) en Supabase." };
  }
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

const t = (v: unknown, max = 300) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s || null;
};
const n = (v: unknown) => {
  if (v === null || v === undefined || String(v).trim() === "") return null;
  const x = Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(x)) throw new AdminActionError(`"${v}" no es un número válido.`);
  return x;
};
const fecha = (v: unknown) => {
  const s = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
};

async function admin() {
  const a = await getSupabaseAdminClient();
  if (!a) throw new AdminActionError("La base de datos no está configurada.");
  return a;
}

function refrescar() {
  revalidatePath("/admin/alquileres");
}

export async function getAlquileresAdmin(): Promise<DatosAlquileres> {
  const perfil = await getPerfilActual();
  const a = await getSupabaseAdminClient();
  if (!a || !perfil || !["administrador", "supervisor"].includes(perfil.rol)) {
    return { personas: [], contratos: [], cuotas: [], servicios: [], liquidaciones: [], faltaSql: false };
  }
  return cargarAlquileres(a);
}

/* ───────────── Personas (propietarios e inquilinos) ───────────── */

export async function guardarPersonaAlqAction(datos: Record<string, string>): Promise<R<{ id: string }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const tipo = datos.tipo === "propietario" ? "propietario" : "inquilino";
    const nombre = t(datos.nombre, 120);
    if (!nombre) throw new AdminActionError("Falta el nombre.");
    const fila = {
      tipo,
      nombre,
      dni: t(datos.dni, 20),
      cuit: t(datos.cuit, 20),
      email: t(datos.email, 120),
      telefono: t(datos.telefono, 40),
      domicilio: t(datos.domicilio, 200),
      cbu_alias: t(datos.cbuAlias, 60),
      notas: t(datos.notas, 1000),
    };
    const a = await admin();
    const q = datos.id ? a.from("alq_personas").update(fila).eq("id", datos.id).select("id").single() : a.from("alq_personas").insert(fila).select("id").single();
    const { data, error } = await q;
    if (error) throw error;
    await registrarActividad(perfil, datos.id ? "actualizar" : "crear", "alquiler_persona", data.id, { nombre, tipo });
    refrescar();
    return { ok: true, id: data.id as string };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarPersonaAlqAction(id: string): Promise<R> {
  try {
    const perfil = await requireRole("administrador");
    const a = await admin();
    const { error } = await a.from("alq_personas").delete().eq("id", id);
    if (error) {
      if (/foreign key|violates/i.test(error.message)) throw new AdminActionError("No se puede borrar: tiene contratos cargados.");
      throw error;
    }
    await registrarActividad(perfil, "eliminar", "alquiler_persona", id, {});
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Genera un link nuevo (el anterior deja de funcionar), por si se compartió con quien no correspondía. */
export async function renovarLinkPersonaAction(id: string): Promise<R> {
  try {
    await requireRole("administrador", "supervisor");
    const a = await admin();
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
    const { error } = await a.from("alq_personas").update({ token }).eq("id", id);
    if (error) throw error;
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ───────────── Contratos ───────────── */

export async function guardarContratoAlqAction(datos: Record<string, string>): Promise<R<{ id: string }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const direccion = t(datos.direccion, 200);
    const inicio = fecha(datos.fechaInicio);
    const fin = fecha(datos.fechaFin);
    const monto = n(datos.montoActual);
    if (!direccion) throw new AdminActionError("Falta la dirección de la propiedad.");
    if (!datos.propietarioId || !datos.inquilinoId) throw new AdminActionError("Elegí el propietario y el inquilino.");
    if (!inicio || !fin || fin <= inicio) throw new AdminActionError("Revisá las fechas de inicio y fin del contrato.");
    if (monto === null || monto < 0) throw new AdminActionError("Falta el monto del alquiler.");
    const dia = Math.min(Math.max(Number(datos.diaVencimiento || 10), 1), 28);
    const fila = {
      direccion,
      localidad: t(datos.localidad, 120),
      propiedad_id: t(datos.propiedadId, 40),
      propietario_id: datos.propietarioId,
      inquilino_id: datos.inquilinoId,
      garantes: t(datos.garantes, 1000),
      fecha_inicio: inicio,
      fecha_fin: fin,
      moneda: datos.moneda === "USD" ? "USD" : "ARS",
      monto_actual: monto,
      dia_vencimiento: dia,
      comision_admin_pct: n(datos.comisionAdminPct) ?? 0,
      punitorio_diario_pct: n(datos.punitorioDiarioPct) ?? 0,
      deposito: n(datos.deposito),
      proximo_ajuste: fecha(datos.proximoAjuste),
      ajuste_detalle: t(datos.ajusteDetalle, 300),
      estado: ["activo", "finalizado", "rescindido"].includes(datos.estado) ? datos.estado : "activo",
      notas: t(datos.notas, 2000),
      actualizado_en: new Date().toISOString(),
    };
    const a = await admin();
    const q = datos.id
      ? a.from("alq_contratos").update(fila).eq("id", datos.id).select("id").single()
      : a.from("alq_contratos").insert(fila).select("id").single();
    const { data, error } = await q;
    if (error) throw error;
    if (datos.id) {
      // Si cambió el día de vencimiento, se corrigen los meses que todavía no se pagaron.
      const { data: pend } = await a.from("alq_cuotas").select("id, periodo").eq("contrato_id", datos.id).is("pagado_en", null);
      for (const c of pend ?? []) {
        await a
          .from("alq_cuotas")
          .update({ vencimiento: `${String(c.periodo).slice(0, 8)}${String(dia).padStart(2, "0")}` })
          .eq("id", c.id);
      }
    }
    await registrarActividad(perfil, datos.id ? "actualizar" : "crear", "alquiler_contrato", data.id, { direccion });
    refrescar();
    return { ok: true, id: data.id as string };
  } catch (err) {
    return fail(err);
  }
}

/** Ajuste del alquiler (cargado a mano): nuevo monto desde un mes en adelante, en los meses sin pagar. */
export async function ajustarMontoContratoAction(
  contratoId: string,
  nuevoMonto: string,
  desdePeriodo: string,
  proximoAjuste: string,
  detalle: string
): Promise<R<{ actualizados: number }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const monto = n(nuevoMonto);
    const desde = fecha(desdePeriodo);
    if (monto === null || monto <= 0) throw new AdminActionError("Ingresá el nuevo monto.");
    if (!desde) throw new AdminActionError("Elegí desde qué mes rige el nuevo monto.");
    const a = await admin();
    const { error } = await a
      .from("alq_contratos")
      .update({
        monto_actual: monto,
        proximo_ajuste: fecha(proximoAjuste),
        ajuste_detalle: t(detalle, 300),
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", contratoId);
    if (error) throw error;
    const { data: upd, error: e2 } = await a
      .from("alq_cuotas")
      .update({ monto, mp_link: null })
      .eq("contrato_id", contratoId)
      .is("pagado_en", null)
      .gte("periodo", `${desde.slice(0, 8)}01`)
      .select("id");
    if (e2) throw e2;
    await registrarActividad(perfil, "actualizar", "alquiler_contrato", contratoId, { ajuste: monto, desde });
    refrescar();
    return { ok: true, actualizados: upd?.length ?? 0 };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarContratoAlqAction(id: string): Promise<R> {
  try {
    const perfil = await requireRole("administrador");
    const a = await admin();
    const { error } = await a.from("alq_contratos").delete().eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "eliminar", "alquiler_contrato", id, {});
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ───────────── Cobros ───────────── */

export async function editarCuotaAlqAction(
  id: string,
  datos: { monto: string; extras: string; extrasDetalle: string; punitorios: string; vencimiento: string; notas: string }
): Promise<R> {
  try {
    await requireRole("administrador", "supervisor");
    const a = await admin();
    const fila: Record<string, unknown> = {
      monto: n(datos.monto) ?? 0,
      extras: n(datos.extras) ?? 0,
      extras_detalle: t(datos.extrasDetalle, 300),
      punitorios: n(datos.punitorios) ?? 0,
      notas: t(datos.notas, 1000),
      mp_link: null,
    };
    const v = fecha(datos.vencimiento);
    if (v) fila.vencimiento = v;
    const { error } = await a.from("alq_cuotas").update(fila).eq("id", id);
    if (error) throw error;
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Registra el pago de un mes y le asigna número de recibo. */
export async function registrarPagoAlqAction(
  id: string,
  datos: { monto: string; fecha: string; medio: string; notas?: string }
): Promise<R<{ recibo: number }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const a = await admin();
    const monto = n(datos.monto);
    if (monto === null || monto <= 0) throw new AdminActionError("Ingresá el monto cobrado.");
    const medio = ["efectivo", "transferencia", "mercadopago"].includes(datos.medio) ? datos.medio : "efectivo";
    const { data: actual } = await a.from("alq_cuotas").select("recibo_numero, contrato_id, periodo").eq("id", id).maybeSingle();
    if (!actual) throw new AdminActionError("No se encontró ese mes.");
    let recibo = actual.recibo_numero as number | null;
    if (!recibo) {
      const { data: nro, error: eNro } = await a.rpc("alq_siguiente_recibo");
      if (eNro) throw eNro;
      recibo = Number(nro);
    }
    const { error } = await a
      .from("alq_cuotas")
      .update({
        pagado_monto: monto,
        pagado_en: fecha(datos.fecha) ?? hoyIso(),
        medio_pago: medio,
        recibo_numero: recibo,
        ...(datos.notas !== undefined ? { notas: t(datos.notas, 1000) } : {}),
      })
      .eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "cobrar", "alquiler_cuota", id, { monto, medio, periodo: actual.periodo });
    refrescar();
    return { ok: true, recibo };
  } catch (err) {
    return fail(err);
  }
}

export async function anularPagoAlqAction(id: string): Promise<R> {
  try {
    const perfil = await requireRole("administrador");
    const a = await admin();
    const { data: c } = await a.from("alq_cuotas").select("liquidacion_id").eq("id", id).maybeSingle();
    if (c?.liquidacion_id) throw new AdminActionError("Ese cobro ya está en una liquidación al propietario: borrá primero la liquidación.");
    const { error } = await a.from("alq_cuotas").update({ pagado_monto: null, pagado_en: null, medio_pago: null }).eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "anular_cobro", "alquiler_cuota", id, {});
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Link de Mercado Pago por el total del mes (alquiler + extras + punitorios a hoy). */
export async function linkPagoAlqAction(id: string): Promise<R<{ url: string }>> {
  try {
    await requireRole("administrador", "supervisor");
    if (!isMercadoPagoConfigured()) throw new AdminActionError("Mercado Pago no está configurado.");
    const a = await admin();
    const { data: c } = await a.from("alq_cuotas").select("*, alq_contratos(*, inquilino:alq_personas!alq_contratos_inquilino_id_fkey(*))").eq("id", id).maybeSingle();
    if (!c) throw new AdminActionError("No se encontró ese mes.");
    const cuota = mapCuota(c);
    const contrato = mapContrato(c.alq_contratos);
    if (contrato.moneda !== "ARS") throw new AdminActionError("Mercado Pago solo cobra en pesos: este contrato está en dólares.");
    if (cuota.pagadoEn) throw new AdminActionError("Ese mes ya está pagado.");
    const inq = (c.alq_contratos as { inquilino: { nombre: string; email: string | null; token: string } }).inquilino;
    const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
    const url = await crearLinkPagoAlquiler({
      cuotaId: id,
      titulo: `Alquiler ${nombrePeriodo(cuota.periodo)} — ${contrato.direccion}`,
      monto: totalCuota(cuota, contrato),
      nombre: inq?.nombre ?? "Inquilino",
      email: inq?.email ?? null,
      volverA: `${site}/mi-alquiler/${inq?.token ?? ""}`,
    });
    if (!url) throw new AdminActionError("Mercado Pago no devolvió el link. Probá de nuevo en un rato.");
    await a.from("alq_cuotas").update({ mp_link: url }).eq("id", id);
    refrescar();
    return { ok: true, url };
  } catch (err) {
    return fail(err);
  }
}

/* ───────────── Expensas, impuestos y servicios ───────────── */

export async function guardarServicioAlqAction(datos: Record<string, string>): Promise<R> {
  try {
    await requireRole("administrador", "supervisor");
    const concepto = t(datos.concepto, 80);
    if (!concepto || !datos.contratoId) throw new AdminActionError("Elegí el contrato y el concepto.");
    const fila = {
      contrato_id: datos.contratoId,
      concepto,
      a_cargo: datos.aCargo === "propietario" ? "propietario" : "inquilino",
      periodo: fecha(datos.periodo),
      vencimiento: fecha(datos.vencimiento),
      monto: n(datos.monto),
      pagado: datos.pagado === "true",
      pagado_en: datos.pagado === "true" ? fecha(datos.pagadoEn) ?? hoyIso() : null,
      notas: t(datos.notas, 500),
    };
    const a = await admin();
    const { error } = datos.id ? await a.from("alq_servicios").update(fila).eq("id", datos.id) : await a.from("alq_servicios").insert(fila);
    if (error) throw error;
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function marcarServicioPagadoAction(id: string, pagado: boolean): Promise<R> {
  try {
    await requireRole("administrador", "supervisor");
    const a = await admin();
    const { error } = await a.from("alq_servicios").update({ pagado, pagado_en: pagado ? hoyIso() : null }).eq("id", id);
    if (error) throw error;
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarServicioAlqAction(id: string): Promise<R> {
  try {
    await requireRole("administrador", "supervisor");
    const a = await admin();
    const { error } = await a.from("alq_servicios").delete().eq("id", id);
    if (error) throw error;
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/* ───────────── Liquidaciones al propietario ───────────── */

/**
 * Liquida al propietario lo cobrado de un contrato que todavía no se le rindió:
 * cobrado − comisión de administración − gastos a cargo del propietario.
 */
export async function crearLiquidacionAction(
  contratoId: string,
  datos: { gastos: string; gastosDetalle: string; notas: string }
): Promise<R<{ id: string }>> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const a = await admin();
    const { data: cRaw } = await a.from("alq_contratos").select("*").eq("id", contratoId).maybeSingle();
    if (!cRaw) throw new AdminActionError("No se encontró el contrato.");
    const contrato = mapContrato(cRaw);
    const { data: cobradas } = await a
      .from("alq_cuotas")
      .select("*")
      .eq("contrato_id", contratoId)
      .not("pagado_en", "is", null)
      .is("liquidacion_id", null)
      .order("periodo");
    const cuotas = (cobradas ?? []).map(mapCuota);
    if (!cuotas.length) throw new AdminActionError("No hay cobros pendientes de liquidar en este contrato.");
    // La comisión se calcula sobre el alquiler (no sobre expensas ni otros extras que se cobran por cuenta de terceros).
    const cobrado = cuotas.reduce((s, c) => s + (c.pagadoMonto ?? 0), 0);
    const baseComision = cuotas.reduce((s, c) => s + Math.min(c.pagadoMonto ?? 0, c.monto + c.punitorios), 0);
    const comision = Math.round(baseComision * contrato.comisionAdminPct) / 100;
    const gastos = n(datos.gastos) ?? 0;
    const neto = Math.round((cobrado - comision - gastos) * 100) / 100;
    const periodo = cuotas[cuotas.length - 1].periodo;
    const { data: liq, error } = await a
      .from("alq_liquidaciones")
      .insert({
        contrato_id: contratoId,
        propietario_id: contrato.propietarioId,
        periodo,
        cobrado,
        comision,
        gastos,
        gastos_detalle: t(datos.gastosDetalle, 500),
        neto,
        notas: t(datos.notas, 1000) ?? `Incluye: ${cuotas.map((c) => nombrePeriodo(c.periodo)).join(", ")}`,
      })
      .select("id")
      .single();
    if (error) throw error;
    const { error: e2 } = await a
      .from("alq_cuotas")
      .update({ liquidacion_id: liq.id })
      .in(
        "id",
        cuotas.map((c) => c.id)
      );
    if (e2) throw e2;
    await registrarActividad(perfil, "crear", "alquiler_liquidacion", liq.id, { neto, contrato: contrato.direccion });
    refrescar();
    return { ok: true, id: liq.id as string };
  } catch (err) {
    return fail(err);
  }
}

export async function marcarLiquidacionPagadaAction(id: string, pagada: boolean, medio: string): Promise<R> {
  try {
    const perfil = await requireRole("administrador", "supervisor");
    const a = await admin();
    const { error } = await a
      .from("alq_liquidaciones")
      .update({ pagada_en: pagada ? hoyIso() : null, medio_pago: pagada ? t(medio, 40) : null })
      .eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, pagada ? "pagar" : "anular_pago", "alquiler_liquidacion", id, {});
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function eliminarLiquidacionAction(id: string): Promise<R> {
  try {
    const perfil = await requireRole("administrador");
    const a = await admin();
    await a.from("alq_cuotas").update({ liquidacion_id: null }).eq("liquidacion_id", id);
    const { error } = await a.from("alq_liquidaciones").delete().eq("id", id);
    if (error) throw error;
    await registrarActividad(perfil, "eliminar", "alquiler_liquidacion", id, {});
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Para el resumen: punitorios a hoy de un mes sin pagar. */
export async function punitoriosHoyAction(cuotaId: string): Promise<R<{ punitorios: number }>> {
  try {
    await requireRole("administrador", "supervisor");
    const a = await admin();
    const { data } = await a.from("alq_cuotas").select("*, alq_contratos(punitorio_diario_pct)").eq("id", cuotaId).maybeSingle();
    if (!data) throw new AdminActionError("No se encontró ese mes.");
    const pct = Number((data.alq_contratos as { punitorio_diario_pct: number }).punitorio_diario_pct ?? 0);
    return { ok: true, punitorios: punitoriosCalculados(mapCuota(data), { punitorioDiarioPct: pct }) };
  } catch (err) {
    return fail(err);
  }
}
