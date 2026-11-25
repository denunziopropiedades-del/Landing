import type { SupabaseClient } from "@supabase/supabase-js";
import { leerConfig, type ConfigArca, type EntornoArca } from "@/lib/arca/config";
import { obtenerTicket } from "@/lib/arca/wsaa";
import { consultarComprobante, cotizacion as pedirCotizacion, solicitarCae, ultimoAutorizado, type Auth, type MensajeArca } from "@/lib/arca/wsfe";

export type ItemFactura = { descripcion: string; detalle?: string; cantidad: number; precio: number };

export type EstadoFactura = "borrador" | "enviando" | "autorizada" | "rechazada" | "descartada";
export type OrigenFactura = "manual" | "sena" | "honorario_cuota" | "alquiler" | "otro";

export type Factura = {
  id: string;
  creadoEn: string;
  estado: EstadoFactura;
  entorno: EntornoArca;
  origen: OrigenFactura;
  origenRef: string | null;
  leadId: string | null;
  tipoCbte: 11 | 13;
  puntoVenta: number;
  numero: number | null;
  fecha: string;
  concepto: number;
  periodoDesde: string | null;
  periodoHasta: string | null;
  vtoPago: string | null;
  receptorDocTipo: number;
  receptorDocNro: string;
  receptorNombre: string;
  receptorDomicilio: string | null;
  receptorEmail: string | null;
  receptorTelefono: string | null;
  receptorCondicionIva: number;
  moneda: "PES" | "DOL";
  cotizacion: number;
  cotizacionFecha: string | null;
  cancelaMismaMoneda: boolean;
  items: ItemFactura[];
  importeTotal: number;
  medioPago: string | null;
  conceptoTipo: string | null;
  cae: string | null;
  caeVto: string | null;
  facturaAsociadaId: string | null;
  errores: MensajeArca[] | null;
  observaciones: MensajeArca[] | null;
  tokenPublico: string;
  creadoPor: string | null;
  emitidaPor: string | null;
  emitidaEn: string | null;
  enviadaEmailEn: string | null;
};

export const DOC_TIPOS: Record<number, string> = { 80: "CUIT", 86: "CUIL", 96: "DNI", 99: "Sin identificar" };
export const CONDICIONES_IVA: Record<number, string> = {
  5: "Consumidor final",
  6: "Responsable Monotributo",
  1: "IVA Responsable Inscripto",
  4: "IVA Sujeto Exento",
  13: "Monotributista Social",
  15: "IVA No Alcanzado",
};
export const CONCEPTOS_RAPIDOS = [
  "Seña / reserva",
  "Honorarios profesionales",
  "Honorarios profesionales · gestión de cobranza",
  "Honorarios profesionales · administración de alquiler",
  "Tasación inmobiliaria",
  "Otro",
];

export function mapFactura(r: Record<string, unknown>): Factura {
  const n = (v: unknown) => (v == null ? null : Number(v));
  const s = (v: unknown) => (v == null ? null : String(v));
  return {
    id: String(r.id),
    creadoEn: String(r.creado_en),
    estado: r.estado as EstadoFactura,
    entorno: (r.entorno as EntornoArca) ?? "homologacion",
    origen: r.origen as OrigenFactura,
    origenRef: s(r.origen_ref),
    leadId: s(r.lead_id),
    tipoCbte: Number(r.tipo_cbte) === 13 ? 13 : 11,
    puntoVenta: Number(r.punto_venta),
    numero: n(r.numero),
    fecha: String(r.fecha),
    concepto: Number(r.concepto ?? 2),
    periodoDesde: s(r.periodo_desde),
    periodoHasta: s(r.periodo_hasta),
    vtoPago: s(r.vto_pago),
    receptorDocTipo: Number(r.receptor_doc_tipo ?? 99),
    receptorDocNro: String(r.receptor_doc_nro ?? "0"),
    receptorNombre: String(r.receptor_nombre ?? ""),
    receptorDomicilio: s(r.receptor_domicilio),
    receptorEmail: s(r.receptor_email),
    receptorTelefono: s(r.receptor_telefono),
    receptorCondicionIva: Number(r.receptor_condicion_iva ?? 5),
    moneda: r.moneda === "DOL" ? "DOL" : "PES",
    cotizacion: Number(r.cotizacion ?? 1),
    cotizacionFecha: s(r.cotizacion_fecha),
    cancelaMismaMoneda: r.cancela_misma_moneda !== false,
    items: Array.isArray(r.items) ? (r.items as ItemFactura[]) : [],
    importeTotal: Number(r.importe_total ?? 0),
    medioPago: s(r.medio_pago),
    conceptoTipo: s(r.concepto_tipo),
    cae: s(r.cae),
    caeVto: s(r.cae_vto),
    facturaAsociadaId: s(r.factura_asociada_id),
    errores: (r.errores as MensajeArca[] | null) ?? null,
    observaciones: (r.observaciones as MensajeArca[] | null) ?? null,
    tokenPublico: String(r.token_publico),
    creadoPor: s(r.creado_por),
    emitidaPor: s(r.emitida_por),
    emitidaEn: s(r.emitida_en),
    enviadaEmailEn: s(r.enviada_email_en),
  };
}

export const hoyAr = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
const aArca = (iso: string) => iso.replace(/-/g, "").slice(0, 8);
const deArca = (v: string | null) => (v && /^\d{8}$/.test(v) ? `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}` : null);

export function totalItems(items: ItemFactura[]) {
  return Math.round(items.reduce((t, i) => t + (Number(i.cantidad) || 0) * (Number(i.precio) || 0), 0) * 100) / 100;
}

/** Valida dígito verificador de CUIT/CUIL. */
export function cuitValido(v: string) {
  const d = v.replace(/\D/g, "");
  if (d.length !== 11) return false;
  const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const suma = pesos.reduce((t, p, i) => t + p * Number(d[i]), 0);
  let dv = 11 - (suma % 11);
  if (dv === 11) dv = 0;
  if (dv === 10) dv = 9;
  return dv === Number(d[10]);
}

/** Problemas que impiden emitir (antes de ir a ARCA). */
export function validarFactura(f: Factura, config: ConfigArca): string[] {
  const p: string[] = [];
  if (!f.items.length) p.push("Agregá al menos una línea de detalle.");
  if (!(f.importeTotal > 0)) p.push("El total tiene que ser mayor a cero.");
  if (Math.abs(totalItems(f.items) - f.importeTotal) > 0.01) p.push("El total no coincide con el detalle.");
  if (!f.receptorNombre.trim()) p.push("Falta el nombre del cliente.");
  if ([80, 86].includes(f.receptorDocTipo) && !cuitValido(f.receptorDocNro)) p.push("El CUIT/CUIL del cliente no es válido.");
  if (f.receptorDocTipo === 96 && !/^\d{7,8}$/.test(f.receptorDocNro.replace(/\D/g, ""))) p.push("El DNI del cliente no es válido.");
  if (f.receptorCondicionIva !== 5 && ![80, 86].includes(f.receptorDocTipo)) {
    p.push("Si el cliente no es consumidor final, hay que cargar su CUIT.");
  }
  // Consumidor final por encima del tope: hay que identificarlo (RG 1415).
  const enPesos = f.moneda === "DOL" ? f.importeTotal * (f.cotizacion > 1 ? f.cotizacion : 0) : f.importeTotal;
  if (f.receptorDocTipo === 99 && (f.moneda === "DOL" || enPesos >= config.topeIdentificacion)) {
    p.push(
      f.moneda === "DOL"
        ? "Para facturar en dólares cargá el DNI, CUIT o CUIL del cliente."
        : `Desde $ ${config.topeIdentificacion.toLocaleString("es-AR")} hay que identificar al cliente (DNI, CUIT o CUIL).`
    );
  }
  if (f.tipoCbte === 13 && !f.facturaAsociadaId) p.push("La nota de crédito tiene que estar asociada a una factura.");
  return p;
}

export async function leerFactura(a: SupabaseClient, id: string): Promise<Factura | null> {
  const { data } = await a.from("arca_facturas").select("*").eq("id", id).maybeSingle();
  return data ? mapFactura(data) : null;
}

export async function authArca(a: SupabaseClient, config: ConfigArca): Promise<Auth> {
  const ticket = await obtenerTicket(a, config.entorno, config.cuit);
  return { ...ticket, cuit: config.cuit, entorno: config.entorno };
}

export type ResultadoEmision = { ok: true; factura: Factura } | { ok: false; error: string; factura?: Factura };

/**
 * Pide el CAE a ARCA para una factura en borrador (o rechazada / cortada a mitad de camino).
 * Es idempotente: si quedó "enviando" con número asignado, primero consulta si ARCA ya la autorizó.
 */
export async function emitirFactura(a: SupabaseClient, id: string, actor: string): Promise<ResultadoEmision> {
  const f = await leerFactura(a, id);
  if (!f) return { ok: false, error: "La factura no existe." };
  if (f.estado === "autorizada") return { ok: true, factura: f };
  if (f.estado === "descartada") return { ok: false, error: "La factura está descartada.", factura: f };

  const config = await leerConfig(a);
  const problemas = validarFactura(f, config);
  if (problemas.length) return { ok: false, error: problemas.join(" "), factura: f };

  let auth: Auth;
  try {
    auth = await authArca(a, config);
  } catch (err) {
    return { ok: false, error: (err as Error).message, factura: f };
  }

  const ptoVta = config.puntoVenta;
  const upd = (campos: Record<string, unknown>) =>
    a.from("arca_facturas").update({ ...campos, actualizado_en: new Date().toISOString() }).eq("id", id).select("*").single();

  try {
    // ¿Quedó a mitad de camino? Si ARCA ya la autorizó, solo guardamos el CAE.
    if (f.estado === "enviando" && f.numero && f.entorno === config.entorno && f.puntoVenta === ptoVta) {
      const previa = await consultarComprobante(auth, ptoVta, f.tipoCbte, f.numero);
      if (previa) {
        const { data } = await upd({
          estado: "autorizada",
          cae: previa.cae,
          cae_vto: deArca(previa.caeVto),
          emitida_por: actor,
          emitida_en: new Date().toISOString(),
          errores: null,
        });
        return { ok: true, factura: mapFactura(data!) };
      }
    }

    // Cotización del dólar (BNA vendedor divisa, la informa ARCA).
    let cotizacion = 1;
    let cotizacionFecha: string | null = null;
    if (f.moneda === "DOL") {
      const c = await pedirCotizacion(auth, "DOL");
      cotizacion = c.cotizacion;
      cotizacionFecha = c.fecha;
      const enPesos = f.importeTotal * cotizacion;
      if (f.receptorDocTipo === 99 && enPesos >= config.topeIdentificacion) {
        return { ok: false, error: "Por el monto, hay que identificar al cliente (DNI, CUIT o CUIL).", factura: f };
      }
    }

    let asociado: { tipo: number; ptoVta: number; numero: number; cuit: string; fecha: string } | undefined;
    if (f.tipoCbte === 13) {
      const orig = f.facturaAsociadaId ? await leerFactura(a, f.facturaAsociadaId) : null;
      if (!orig || orig.estado !== "autorizada" || !orig.numero) {
        return { ok: false, error: "La factura asociada no está autorizada.", factura: f };
      }
      if (orig.entorno !== config.entorno) {
        return { ok: false, error: "La factura asociada es de otro entorno (pruebas/producción).", factura: f };
      }
      asociado = { tipo: orig.tipoCbte, ptoVta: orig.puntoVenta, numero: orig.numero, cuit: config.cuit, fecha: aArca(orig.fecha) };
    }

    const fecha = hoyAr();
    const ultimo = await ultimoAutorizado(auth, ptoVta, f.tipoCbte);
    const numero = ultimo + 1;

    const reservado = await upd({
      estado: "enviando",
      entorno: config.entorno,
      punto_venta: ptoVta,
      numero,
      fecha,
      cotizacion,
      cotizacion_fecha: cotizacionFecha,
      periodo_desde: f.periodoDesde ?? fecha,
      periodo_hasta: f.periodoHasta ?? f.periodoDesde ?? fecha,
      vto_pago: f.vtoPago && f.vtoPago >= fecha ? f.vtoPago : fecha,
      errores: null,
      observaciones: null,
    });
    if (reservado.error) {
      return { ok: false, error: `No se pudo reservar el número (¿se está emitiendo otra al mismo tiempo?). Probá de nuevo.`, factura: f };
    }
    const r = mapFactura(reservado.data!);

    const resp = await solicitarCae(auth, {
      ptoVta,
      tipo: r.tipoCbte,
      numero,
      concepto: r.concepto,
      docTipo: r.receptorDocTipo,
      docNro: r.receptorDocTipo === 99 ? "0" : r.receptorDocNro.replace(/\D/g, ""),
      condicionIvaReceptor: r.receptorCondicionIva,
      fecha: aArca(fecha),
      total: r.importeTotal,
      servDesde: aArca(r.periodoDesde ?? fecha),
      servHasta: aArca(r.periodoHasta ?? fecha),
      vtoPago: aArca(r.vtoPago ?? fecha),
      moneda: r.moneda,
      cotizacion,
      cancelaMismaMoneda: r.cancelaMismaMoneda,
      asociado,
    });

    if (resp.resultado === "A" && resp.cae) {
      const { data } = await upd({
        estado: "autorizada",
        cae: resp.cae,
        cae_vto: deArca(resp.caeVto),
        observaciones: resp.observaciones.length ? resp.observaciones : null,
        respuesta_xml: resp.xml.slice(0, 20000),
        emitida_por: actor,
        emitida_en: new Date().toISOString(),
      });
      return { ok: true, factura: mapFactura(data!) };
    }

    const motivos = [...resp.errores, ...resp.observaciones];
    const { data } = await upd({
      estado: "rechazada",
      numero: null,
      errores: resp.errores.length ? resp.errores : null,
      observaciones: resp.observaciones.length ? resp.observaciones : null,
      respuesta_xml: resp.xml.slice(0, 20000),
    });
    return {
      ok: false,
      error: `ARCA rechazó el comprobante: ${motivos.map((m) => `[${m.codigo}] ${m.mensaje}`).join(" · ") || "sin detalle"}`,
      factura: data ? mapFactura(data) : f,
    };
  } catch (err) {
    // Error de red/servidor: queda "enviando" con el número; al reintentar se consulta antes de volver a pedir.
    console.error("Error emitiendo factura ARCA", err);
    return { ok: false, error: `No se pudo completar con ARCA: ${(err as Error).message}. Podés reintentar sin riesgo de duplicarla.` };
  }
}

// ---------- Borradores automáticos desde cobros ----------

export type CobroFacturable = {
  origen: Exclude<OrigenFactura, "manual">;
  origenRef: string;
  leadId?: string | null;
  receptor: { nombre: string; dni?: string | null; cuit?: string | null; email?: string | null; telefono?: string | null; domicilio?: string | null };
  moneda: "PES" | "DOL";
  importe: number;
  descripcion: string;
  detalle?: string;
  medioPago?: string | null;
  periodoDesde?: string | null;
  periodoHasta?: string | null;
  actor?: string;
};

export function docDeReceptor(r: { dni?: string | null; cuit?: string | null }) {
  const cuit = (r.cuit ?? "").replace(/\D/g, "");
  if (cuit && cuitValido(cuit)) return { tipo: 80, nro: cuit };
  const dni = (r.dni ?? "").replace(/\D/g, "");
  if (/^\d{7,8}$/.test(dni)) return { tipo: 96, nro: dni };
  return { tipo: 99, nro: "0" };
}

/**
 * Registra un cobro para facturar: crea la factura en borrador (una sola vez por cobro)
 * y, si la emisión automática está activada, la emite y la manda por mail.
 * Nunca lanza: un problema de facturación no debe frenar el registro del pago.
 */
export async function registrarCobroFacturable(a: SupabaseClient, c: CobroFacturable): Promise<void> {
  try {
    if (!(c.importe > 0)) return;
    const config = await leerConfig(a);
    const doc = docDeReceptor(c.receptor);
    const fecha = hoyAr();
    const { data, error } = await a
      .from("arca_facturas")
      .insert({
        origen: c.origen,
        origen_ref: c.origenRef,
        lead_id: c.leadId ?? null,
        entorno: config.entorno,
        punto_venta: config.puntoVenta,
        fecha,
        periodo_desde: c.periodoDesde ?? fecha,
        periodo_hasta: c.periodoHasta ?? c.periodoDesde ?? fecha,
        vto_pago: fecha,
        receptor_doc_tipo: doc.tipo,
        receptor_doc_nro: doc.nro,
        receptor_nombre: c.receptor.nombre.trim() || "Consumidor final",
        receptor_email: c.receptor.email ?? null,
        receptor_telefono: c.receptor.telefono ?? null,
        receptor_domicilio: c.receptor.domicilio ?? null,
        receptor_condicion_iva: 5,
        moneda: c.moneda,
        cancela_misma_moneda: true,
        items: [{ descripcion: c.descripcion, detalle: c.detalle ?? "", cantidad: 1, precio: Math.round(c.importe * 100) / 100 }],
        importe_total: Math.round(c.importe * 100) / 100,
        medio_pago: c.medioPago ?? null,
        concepto_tipo: c.descripcion,
        creado_por: c.actor ?? "sistema",
      })
      .select("id")
      .maybeSingle();
    if (error) {
      if (!/duplicate key|arca_facturas_origen_ref_key/.test(error.message)) console.error("No se pudo crear la factura en borrador", error);
      return;
    }
    if (data && config.emisionAutomatica) {
      const res = await emitirFactura(a, data.id as string, c.actor ?? "sistema");
      if (res.ok) {
        const { enviarFacturaPorEmail } = await import("@/lib/arca/envio");
        await enviarFacturaPorEmail(a, res.factura).catch((e) => console.error("No se pudo enviar la factura por mail", e));
      }
    }
  } catch (err) {
    console.error("Error registrando cobro para facturar", err);
  }
}

/** Datos del cliente desde la ficha del CRM. */
export async function receptorDeLead(a: SupabaseClient, leadId: string) {
  const { data } = await a.from("leads").select("nombre, apellido, dni, email, telefono").eq("id", leadId).maybeSingle();
  if (!data) return null;
  const nombre = [data.apellido, data.nombre].filter(Boolean).join(" ").trim();
  return { nombre: nombre || String(data.nombre ?? ""), dni: data.dni as string | null, email: data.email as string | null, telefono: data.telefono as string | null };
}
