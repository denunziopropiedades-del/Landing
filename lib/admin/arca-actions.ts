"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { leerConfig, type ConfigArca } from "@/lib/arca/config";
import {
  emitirFactura,
  hoyAr,
  leerFactura,
  mapFactura,
  totalItems,
  validarFactura,
  type Factura,
  type ItemFactura,
} from "@/lib/arca/facturas";
import { enviarFacturaPorEmail } from "@/lib/arca/envio";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  if (/arca_facturas|arca_config|schema cache|does not exist/i.test(msg)) {
    return { ok: false, error: "Faltan las tablas de facturación (sql-arca-facturacion.sql) en Supabase." };
  }
  console.error(err);
  return { ok: false, error: msg || "Ocurrió un error inesperado. Intentá nuevamente." };
}

const refrescar = () => {
  revalidatePath("/admin/arca");
  revalidatePath("/admin/facturacion");
};

async function admin() {
  const a = await getSupabaseAdminClient();
  if (!a) throw new AdminActionError("Supabase no está configurado.");
  return a;
}

export type DatosPanelArca = { facturas: Factura[]; config: ConfigArca; credenciales: { homologacion: boolean; produccion: boolean } };

export async function getDatosPanelArca(): Promise<DatosPanelArca> {
  await requireRole("administrador", "supervisor");
  const a = await admin();
  const [{ data }, config] = await Promise.all([
    a.from("arca_facturas").select("*").order("creado_en", { ascending: false }).limit(1000),
    leerConfig(a),
  ]);
  const key = !!process.env.ARCA_KEY?.trim();
  return {
    facturas: (data ?? []).map(mapFactura),
    config,
    credenciales: { homologacion: key && !!process.env.ARCA_CERT_HOMO?.trim(), produccion: key && !!process.env.ARCA_CERT?.trim() },
  };
}

export async function guardarConfigArcaAction(datos: Partial<ConfigArca>): Promise<Resultado> {
  try {
    const actor = await requireRole("administrador");
    const a = await admin();
    const fila: Record<string, unknown> = { actualizado_en: new Date().toISOString() };
    if (datos.domicilio !== undefined) fila.domicilio = datos.domicilio.trim() || null;
    if (datos.iibb !== undefined) fila.iibb = datos.iibb.trim() || null;
    if (datos.inicioActividades !== undefined) fila.inicio_actividades = datos.inicioActividades || null;
    if (datos.razonSocial) fila.razon_social = datos.razonSocial.trim();
    if (datos.nombreFantasia) fila.nombre_fantasia = datos.nombreFantasia.trim();
    if (datos.matricula !== undefined) fila.matricula = datos.matricula.trim();
    if (datos.telefonos !== undefined) fila.telefonos = datos.telefonos.trim();
    if (datos.web !== undefined) fila.web = datos.web.trim();
    if (datos.puntoVenta) fila.punto_venta = Math.trunc(Number(datos.puntoVenta));
    if (datos.topeIdentificacion) fila.tope_identificacion = Number(datos.topeIdentificacion);
    if (datos.emisionAutomatica !== undefined) fila.emision_automatica = datos.emisionAutomatica;
    if (datos.entorno) {
      if (datos.entorno === "produccion" && !(process.env.ARCA_CERT?.trim() && process.env.ARCA_KEY?.trim())) {
        throw new AdminActionError("Para pasar a producción faltan ARCA_CERT y ARCA_KEY en Vercel.");
      }
      fila.entorno = datos.entorno;
    }
    const { error } = await a.from("arca_config").upsert({ id: 1, ...fila });
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "arca_config", null, { cambios: Object.keys(fila).join(", ") });
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export type DatosFacturaManual = {
  tipoCbte: 11 | 13;
  facturaAsociadaId?: string | null;
  leadId?: string | null;
  receptorDocTipo: number;
  receptorDocNro: string;
  receptorNombre: string;
  receptorDomicilio?: string;
  receptorEmail?: string;
  receptorTelefono?: string;
  receptorCondicionIva: number;
  moneda: "PES" | "DOL";
  cancelaMismaMoneda: boolean;
  conceptoTipo: string;
  items: ItemFactura[];
  periodoDesde?: string;
  periodoHasta?: string;
  vtoPago?: string;
  medioPago?: string;
};

/** Alta manual desde el botón ARCA - FACTURAS. Si `emitir` es true, pide el CAE en el momento. */
export async function crearFacturaManualAction(d: DatosFacturaManual, emitir: boolean): Promise<Resultado<{ factura: Factura }>> {
  try {
    const actor = await requireRole("administrador");
    const a = await admin();
    const config = await leerConfig(a);
    const items = d.items
      .map((i) => ({
        descripcion: i.descripcion.trim().slice(0, 200),
        detalle: (i.detalle ?? "").trim().slice(0, 300),
        cantidad: Number(i.cantidad) || 1,
        precio: Math.round((Number(i.precio) || 0) * 100) / 100,
      }))
      .filter((i) => i.descripcion && i.precio > 0);
    const total = totalItems(items);
    const fecha = hoyAr();

    let asociada: Factura | null = null;
    if (d.tipoCbte === 13) {
      asociada = d.facturaAsociadaId ? await leerFactura(a, d.facturaAsociadaId) : null;
      if (!asociada || asociada.estado !== "autorizada") throw new AdminActionError("Elegí la factura autorizada que anula la nota de crédito.");
      if (total > asociada.importeTotal + 0.01) throw new AdminActionError("La nota de crédito no puede superar el total de la factura.");
    }

    const fila = {
      origen: "manual",
      estado: "borrador",
      entorno: config.entorno,
      punto_venta: config.puntoVenta,
      lead_id: d.leadId || asociada?.leadId || null,
      tipo_cbte: d.tipoCbte,
      factura_asociada_id: asociada?.id ?? null,
      fecha,
      periodo_desde: d.periodoDesde || fecha,
      periodo_hasta: d.periodoHasta || d.periodoDesde || fecha,
      vto_pago: d.vtoPago || fecha,
      receptor_doc_tipo: d.receptorDocTipo,
      receptor_doc_nro: d.receptorDocTipo === 99 ? "0" : d.receptorDocNro.replace(/\D/g, ""),
      receptor_nombre: d.receptorNombre.trim().slice(0, 150),
      receptor_domicilio: d.receptorDomicilio?.trim() || null,
      receptor_email: d.receptorEmail?.trim() || null,
      receptor_telefono: d.receptorTelefono?.trim() || null,
      receptor_condicion_iva: d.receptorCondicionIva,
      moneda: d.moneda,
      cancela_misma_moneda: d.cancelaMismaMoneda,
      items,
      importe_total: total,
      medio_pago: d.medioPago || null,
      concepto_tipo: d.conceptoTipo || null,
      creado_por: actor.email,
    };
    const prueba = mapFactura({ ...fila, id: "x", creado_en: "", token_publico: "", numero: null });
    const problemas = validarFactura(prueba, config);
    if (problemas.length) throw new AdminActionError(problemas.join(" "));

    const { data, error } = await a.from("arca_facturas").insert(fila).select("*").single();
    if (error) throw new Error(error.message);
    let factura = mapFactura(data);
    await registrarActividad(actor, "crear", "arca_factura", factura.id, { cliente: factura.receptorNombre, total });

    if (emitir) {
      const res = await emitirFactura(a, factura.id, actor.email);
      refrescar();
      if (!res.ok) return { ok: false, error: `Se guardó como borrador, pero no se pudo emitir: ${res.error}` };
      factura = res.factura;
      if (factura.receptorEmail) await enviarFacturaPorEmail(a, factura).catch((e) => console.error(e));
    }
    refrescar();
    return { ok: true, factura };
  } catch (err) {
    return fail(err);
  }
}

export async function emitirFacturaAction(id: string, enviarMail = true): Promise<Resultado<{ factura: Factura }>> {
  try {
    const actor = await requireRole("administrador");
    const a = await admin();
    const res = await emitirFactura(a, id, actor.email);
    refrescar();
    if (!res.ok) return { ok: false, error: res.error };
    await registrarActividad(actor, "actualizar", "arca_factura", id, { emitida: `${res.factura.puntoVenta}-${res.factura.numero}`, cae: res.factura.cae });
    if (enviarMail && res.factura.receptorEmail) await enviarFacturaPorEmail(a, res.factura).catch((e) => console.error(e));
    return { ok: true, factura: res.factura };
  } catch (err) {
    return fail(err);
  }
}

export async function actualizarBorradorAction(id: string, d: DatosFacturaManual): Promise<Resultado> {
  try {
    const actor = await requireRole("administrador");
    const a = await admin();
    const f = await leerFactura(a, id);
    if (!f) throw new AdminActionError("La factura no existe.");
    if (!["borrador", "rechazada"].includes(f.estado)) throw new AdminActionError("Solo se pueden editar borradores o rechazadas.");
    const items = d.items.filter((i) => i.descripcion.trim() && Number(i.precio) > 0);
    const { error } = await a
      .from("arca_facturas")
      .update({
        receptor_doc_tipo: d.receptorDocTipo,
        receptor_doc_nro: d.receptorDocTipo === 99 ? "0" : d.receptorDocNro.replace(/\D/g, ""),
        receptor_nombre: d.receptorNombre.trim(),
        receptor_domicilio: d.receptorDomicilio?.trim() || null,
        receptor_email: d.receptorEmail?.trim() || null,
        receptor_telefono: d.receptorTelefono?.trim() || null,
        receptor_condicion_iva: d.receptorCondicionIva,
        moneda: d.moneda,
        cancela_misma_moneda: d.cancelaMismaMoneda,
        items,
        importe_total: totalItems(items),
        concepto_tipo: d.conceptoTipo || null,
        medio_pago: d.medioPago || null,
        periodo_desde: d.periodoDesde || null,
        periodo_hasta: d.periodoHasta || null,
        actualizado_en: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "actualizar", "arca_factura", id, { cliente: d.receptorNombre });
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function descartarBorradorAction(id: string): Promise<Resultado> {
  try {
    const actor = await requireRole("administrador");
    const a = await admin();
    const f = await leerFactura(a, id);
    if (!f) throw new AdminActionError("La factura no existe.");
    if (!["borrador", "rechazada"].includes(f.estado)) {
      throw new AdminActionError("Una factura autorizada no se puede borrar: emití una nota de crédito.");
    }
    const { error } = await a.from("arca_facturas").update({ estado: "descartada", actualizado_en: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message);
    await registrarActividad(actor, "eliminar", "arca_factura", id, { cliente: f.receptorNombre });
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function reenviarFacturaEmailAction(id: string): Promise<Resultado> {
  try {
    await requireRole("administrador", "supervisor");
    const a = await admin();
    const f = await leerFactura(a, id);
    if (!f) throw new AdminActionError("La factura no existe.");
    const res = await enviarFacturaPorEmail(a, f);
    refrescar();
    return res.ok ? { ok: true } : { ok: false, error: res.error ?? "No se pudo enviar." };
  } catch (err) {
    return fail(err);
  }
}
