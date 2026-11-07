"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { AdminActionError, getPerfilActual, requireRole } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { sendEmail, sendNotificationEmail } from "@/lib/email";
import { buildWhatsappClienteUrl } from "@/lib/whatsapp";
import { nombrePeriodo } from "@/lib/alquileres";
import {
  BUCKET,
  NOMBRE_TIPO,
  PREFIJO,
  crearLink,
  fechaAr,
  hoyAr,
  leerPdf,
  mapDoc,
  monto,
  nuevoCodigoVerificacion,
  registrarEvento,
  sha256,
  yaOcurrio,
  type DatosLibreDeuda,
  type DatosReserva,
  type DocEmitido,
  type TipoDoc,
} from "@/lib/docs-clientes/core";
import { generarPdfDocumento } from "@/lib/docs-clientes/pdf";
import { mailAvisoInterno, mailEnvioDocumento, mensajeWhatsappDocumento } from "@/lib/docs-clientes/emails";
import { admitePagoMp, asegurarLinkPagoReserva, urlQrPago } from "@/lib/docs-clientes/pago";

type R<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  const msg = err instanceof Error ? err.message : String(err);
  if (/doc_|schema cache|does not exist/i.test(msg)) {
    return { ok: false, error: "Faltan las tablas de documentos (sql-documentos-clientes.sql) en Supabase." };
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
const email = (v: unknown) => {
  const s = String(v ?? "").trim().toLowerCase();
  if (!s) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new AdminActionError(`"${s}" no parece un email válido.`);
  return s;
};

async function contexto() {
  const perfil = await requireRole("administrador", "supervisor");
  const a = await getSupabaseAdminClient();
  if (!a) throw new AdminActionError("La base de datos no está configurada.");
  return { perfil, a };
}

const refrescar = () => revalidatePath("/admin/documentos-clientes");

async function cargarDoc(a: SupabaseClient, id: string): Promise<DocEmitido> {
  const { data } = await a.from("doc_emitidos").select("*").eq("id", id).maybeSingle();
  if (!data) throw new AdminActionError("No se encontró el documento.");
  return mapDoc(data);
}

/* ───────────── Datos para el panel ───────────── */

export type LinkPanel = {
  id: string;
  canal: string | null;
  creadoEn: string;
  venceEn: string;
  revocadoEn: string | null;
  accesos: number;
  ultimoAccesoEn: string | null;
};
export type EventoPanel = { id: string; tipo: string; detalle: Record<string, unknown>; actor: string | null; creadoEn: string };
export type DecisionPanel = { decision: string; creadoEn: string; email: string | null; motivo: string | null; ip: string | null; pdfSha256: string | null; version: number };
export type CandidatoLead = {
  id: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  dni: string | null;
  inmueble: string;
  precioUsd: number | null;
  financiado: boolean;
  cuotas: { total: number; pagadas: number; vencidasImpagas: number };
};
export type CandidatoAlquiler = {
  id: string;
  direccion: string;
  inquilino: string;
  email: string | null;
  vencidasImpagas: number;
  serviciosImpagos: number;
};
export type DatosPanelDocs = {
  docs: (DocEmitido & { links: LinkPanel[]; eventos: EventoPanel[]; decisiones: DecisionPanel[] })[];
  leads: CandidatoLead[];
  alquileres: CandidatoAlquiler[];
  faltaSql: boolean;
};

export async function getDatosDocsClientes(): Promise<DatosPanelDocs> {
  const vacio: DatosPanelDocs = { docs: [], leads: [], alquileres: [], faltaSql: false };
  const perfil = await getPerfilActual();
  const a = await getSupabaseAdminClient();
  if (!a || !perfil || !["administrador", "supervisor"].includes(perfil.rol)) return vacio;

  const { data: docsRaw, error } = await a.from("doc_emitidos").select("*").order("emitido_en", { ascending: false }).limit(300);
  if (error) return { ...vacio, faltaSql: /doc_|schema cache|does not exist/i.test(error.message) };
  const ids = (docsRaw ?? []).map((d) => d.id as string);
  const hoy = hoyAr();

  const [links, eventos, decisiones, leadsRaw, cuotasRaw, contratosRaw, alqCuotas, alqServ, personas] = await Promise.all([
    ids.length ? a.from("doc_links").select("*").in("documento_id", ids).order("creado_en", { ascending: false }) : Promise.resolve({ data: [] }),
    ids.length ? a.from("doc_eventos").select("*").in("documento_id", ids).order("creado_en", { ascending: false }).limit(3000) : Promise.resolve({ data: [] }),
    ids.length ? a.from("doc_decisiones").select("*").in("documento_id", ids).order("creado_en", { ascending: false }) : Promise.resolve({ data: [] }),
    a
      .from("leads")
      .select("id, nombre, apellido, email, telefono, dni, manzana, forma_pago, estado, proyectos(nombre), lotes(manzana, numero, precio_usd), lead_lotes(lotes(manzana, numero, precio_usd))")
      .not("estado", "eq", "descartado")
      .order("actualizado_en", { ascending: false })
      .limit(1000),
    a.from("cuotas").select("lead_id, pagada, vencimiento"),
    a.from("alq_contratos").select("id, direccion, localidad, inquilino_id, estado").eq("estado", "activo"),
    a.from("alq_cuotas").select("contrato_id, vencimiento, pagado_en"),
    a.from("alq_servicios").select("contrato_id, a_cargo, vencimiento, pagado"),
    a.from("alq_personas").select("id, nombre, email"),
  ]);

  const porDoc = <T extends { documento_id: string }>(rows: T[] | null) => {
    const m = new Map<string, T[]>();
    for (const r of rows ?? []) m.set(r.documento_id, [...(m.get(r.documento_id) ?? []), r]);
    return m;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lk = porDoc((links.data ?? []) as any[]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ev = porDoc((eventos.data ?? []) as any[]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dc = porDoc((decisiones.data ?? []) as any[]);

  const cuotasPorLead = new Map<string, { total: number; pagadas: number; vencidasImpagas: number }>();
  for (const c of cuotasRaw.data ?? []) {
    const x = cuotasPorLead.get(c.lead_id as string) ?? { total: 0, pagadas: 0, vencidasImpagas: 0 };
    x.total++;
    if (c.pagada) x.pagadas++;
    else if (String(c.vencimiento) < hoy) x.vencidasImpagas++;
    cuotasPorLead.set(c.lead_id as string, x);
  }

  type LoteRaw = { manzana: string | null; numero: string | null; precio_usd: number | null };
  const leads: CandidatoLead[] = (leadsRaw.data ?? []).map((l) => {
    const varios = ((l.lead_lotes ?? []) as unknown as { lotes: LoteRaw | null }[]).map((x) => x.lotes).filter((x): x is LoteRaw => !!x);
    const lotes = varios.length ? varios : l.lotes ? [l.lotes as unknown as LoteRaw] : [];
    const proyecto = (l.proyectos as unknown as { nombre: string } | null)?.nombre ?? "";
    const loteTxt = lotes.map((x) => `Lote ${x.numero} – Manzana ${x.manzana ?? l.manzana ?? ""}`).join(" / ");
    return {
      id: l.id as string,
      nombre: [l.nombre, l.apellido].filter(Boolean).join(" "),
      email: (l.email as string) || null,
      telefono: (l.telefono as string) || null,
      dni: (l.dni as string) || null,
      inmueble: [loteTxt, proyecto].filter(Boolean).join(", "),
      precioUsd: lotes.length ? lotes.reduce((s, x) => s + Number(x.precio_usd ?? 0), 0) || null : null,
      financiado: l.forma_pago === "financiado",
      cuotas: cuotasPorLead.get(l.id as string) ?? { total: 0, pagadas: 0, vencidasImpagas: 0 },
    };
  });

  const persona = new Map((personas.data ?? []).map((p) => [p.id as string, p]));
  const alquileres: CandidatoAlquiler[] = (contratosRaw.data ?? []).map((c) => {
    const inq = persona.get(c.inquilino_id as string);
    return {
      id: c.id as string,
      direccion: [c.direccion, c.localidad].filter(Boolean).join(", "),
      inquilino: (inq?.nombre as string) ?? "—",
      email: (inq?.email as string) || null,
      vencidasImpagas: (alqCuotas.data ?? []).filter((q) => q.contrato_id === c.id && !q.pagado_en && String(q.vencimiento) < hoy).length,
      serviciosImpagos: (alqServ.data ?? []).filter(
        (s) => s.contrato_id === c.id && s.a_cargo === "inquilino" && !s.pagado && s.vencimiento && String(s.vencimiento) < hoy
      ).length,
    };
  });

  return {
    docs: (docsRaw ?? []).map((r) => ({
      ...mapDoc(r),
      links: (lk.get(r.id) ?? []).map((l) => ({
        id: l.id,
        canal: l.canal ?? null,
        creadoEn: l.creado_en,
        venceEn: l.vence_en,
        revocadoEn: l.revocado_en ?? null,
        accesos: Number(l.accesos ?? 0),
        ultimoAccesoEn: l.ultimo_acceso_en ?? null,
      })),
      eventos: (ev.get(r.id) ?? []).map((e) => ({ id: e.id, tipo: e.tipo, detalle: e.detalle ?? {}, actor: e.actor ?? null, creadoEn: e.creado_en })),
      decisiones: (dc.get(r.id) ?? []).map((d) => ({
        decision: d.decision,
        creadoEn: d.creado_en,
        email: d.email_verificado ?? null,
        motivo: d.motivo ?? null,
        ip: d.ip ?? null,
        pdfSha256: d.pdf_sha256 ?? null,
        version: Number(d.version ?? 1),
      })),
    })),
    leads,
    alquileres,
    faltaSql: false,
  };
}

/* ───────────── Emisión ───────────── */

async function emitir(
  a: SupabaseClient,
  actorEmail: string,
  base: Omit<DocEmitido, "id" | "numero" | "codigoVerificacion" | "version" | "estado" | "pdfPath" | "pdfSha256" | "emitidoEn" | "emitidoPorEmail" | "anuladoEn" | "anuladoMotivo" | "pagoEstado" | "pagoLink" | "pagoMonto" | "pagoMedio" | "pagoEn">
): Promise<DocEmitido> {
  const anio = Number(hoyAr().slice(0, 4));
  const { data: nro, error: eNro } = await a.rpc("doc_siguiente_numero", { p_tipo: base.tipo, p_anio: anio });
  if (eNro) throw new Error(eNro.message);
  const numero = `${PREFIJO[base.tipo as TipoDoc]}-${anio}-${String(nro).padStart(6, "0")}`;
  const emitidoEn = new Date().toISOString();

  for (let intento = 0; intento < 5; intento++) {
    const codigo = nuevoCodigoVerificacion();
    const borrador: DocEmitido = {
      ...base,
      id: "",
      numero,
      codigoVerificacion: codigo,
      version: 1,
      estado: "emitido",
      pdfPath: null,
      pdfSha256: null,
      emitidoEn,
      emitidoPorEmail: actorEmail,
      anuladoEn: null,
      anuladoMotivo: null,
      pagoEstado: base.tipo === "reserva" ? "pendiente" : null,
      pagoLink: null,
      pagoMonto: null,
      pagoMedio: null,
      pagoEn: null,
    };
    const pdf = await generarPdfDocumento(borrador);
    const hash = sha256(pdf);
    const path = `${base.tipo}/${numero}.pdf`;
    const { error: eUp } = await a.storage.from(BUCKET).upload(path, pdf, { contentType: "application/pdf", upsert: true });
    if (eUp) throw new Error(`No se pudo guardar el PDF: ${eUp.message}`);

    const { data, error } = await a
      .from("doc_emitidos")
      .insert({
        tipo: base.tipo,
        numero,
        codigo_verificacion: codigo,
        version: 1,
        estado: "emitido",
        lead_id: base.leadId,
        alq_contrato_id: base.alqContratoId,
        cliente_nombre: base.clienteNombre,
        cliente_email: base.clienteEmail,
        cliente_telefono: base.clienteTelefono,
        cliente_dni: base.clienteDni,
        datos: base.datos,
        acepta_habilitada: base.aceptaHabilitada,
        vence_en: base.venceEn,
        pago_estado: base.tipo === "reserva" ? "pendiente" : null,
        pdf_path: path,
        pdf_sha256: hash,
        emitido_en: emitidoEn,
        emitido_por_email: actorEmail,
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505" && /codigo_verificacion/.test(error.message)) continue; // código repetido: otro intento
      throw new Error(error.message);
    }
    const doc = mapDoc(data);
    await registrarEvento(a, doc.id, "emitido", { numero, sha256: hash }, actorEmail);
    if (!(await yaOcurrio(a, doc.id, "aviso_emitido"))) {
      try {
        const m = mailAvisoInterno(base.tipo === "reserva" ? "Reserva emitida" : "Certificado de libre deuda emitido", doc);
        await sendNotificationEmail(m.asunto, m.html);
        await registrarEvento(a, doc.id, "aviso_emitido", {}, "sistema");
      } catch (err) {
        console.error("No se pudo avisar la emisión", err);
      }
    }
    return doc;
  }
  throw new Error("No se pudo generar un código de verificación único.");
}

const CONDICIONES_BASE = `El importe de la reserva se imputará íntegramente a cuenta del precio de la operación al momento de concretarse la compraventa.

La reserva asegura la disponibilidad del inmueble a favor del cliente durante el plazo de validez indicado. Vencido dicho plazo sin que se haya formalizado la operación, la reserva quedará sin efecto.

El importe abonado en concepto de reserva, denominada seña, no será devuelto en caso de cancelación o anulación de la operación, ni cuando no se concrete el acuerdo previamente pactado.

Los honorarios profesionales del corredor interviniente son los indicados en este documento y se calculan sobre el monto total de la operación. La operación es gestionada por la inmobiliaria; los gastos e impuestos que correspondan a cada parte se informarán al momento de la firma del boleto o escritura.`;

export async function condicionesReservaBase(): Promise<string> {
  return CONDICIONES_BASE;
}

export async function emitirReservaAction(d: Record<string, string>): Promise<R<{ id: string; numero: string }>> {
  try {
    const { perfil, a } = await contexto();
    const clienteNombre = t(d.clienteNombre, 160);
    const inmueble = t(d.inmueble, 300);
    const importe = n(d.importeReserva);
    const vence = fecha(d.venceEn);
    const acepta = d.aceptaHabilitada === "1" || d.aceptaHabilitada === "true";
    const mail = email(d.clienteEmail);
    if (!clienteNombre) throw new AdminActionError("Falta el nombre del cliente.");
    if (!inmueble) throw new AdminActionError("Falta el inmueble.");
    if (!importe || importe <= 0) throw new AdminActionError("Falta el importe de la reserva.");
    if (!vence || vence < hoyAr()) throw new AdminActionError("Indicá hasta cuándo es válida la reserva (fecha de hoy en adelante).");
    if (acepta && !mail) throw new AdminActionError("Para que el cliente pueda aceptar online hace falta su email (ahí le llega el código).");
    const condiciones = t(d.condiciones, 8000) ?? CONDICIONES_BASE;
    const datos: DatosReserva = {
      inmueble,
      valorVenta: n(d.valorVenta),
      monedaVenta: d.monedaVenta === "ARS" ? "ARS" : "USD",
      importeReserva: importe,
      monedaReserva: d.monedaReserva === "USD" ? "USD" : "ARS",
      formaPagoSaldo: t(d.formaPagoSaldo, 500),
      honorariosPct: n(d.honorariosPct),
      condiciones,
    };
    const doc = await emitir(a, perfil.email, {
      tipo: "reserva",
      leadId: t(d.leadId, 40),
      alqContratoId: null,
      clienteNombre,
      clienteEmail: mail,
      clienteTelefono: t(d.clienteTelefono, 40),
      clienteDni: t(d.clienteDni, 20),
      datos,
      aceptaHabilitada: acepta,
      venceEn: vence,
    });
    await asegurarLinkPagoReserva(a, doc, perfil.email);
    await registrarActividad(perfil, "emitir", "documento_cliente", doc.id, { numero: doc.numero, cliente: clienteNombre });
    refrescar();
    return { ok: true, id: doc.id, numero: doc.numero };
  } catch (err) {
    return fail(err);
  }
}

export async function emitirLibreDeudaAction(d: { origen: "lote" | "alquiler"; id: string }): Promise<R<{ id: string; numero: string }>> {
  try {
    const { perfil, a } = await contexto();
    const hoy = hoyAr();
    let base: Parameters<typeof emitir>[2];

    if (d.origen === "lote") {
      const { data: l } = await a
        .from("leads")
        .select("id, nombre, apellido, email, telefono, dni, manzana, proyectos(nombre), lotes(manzana, numero), lead_lotes(lotes(manzana, numero))")
        .eq("id", d.id)
        .maybeSingle();
      if (!l) throw new AdminActionError("No se encontró el cliente.");
      const { data: cs } = await a.from("cuotas").select("numero, pagada, pagado_en, vencimiento").eq("lead_id", d.id).order("numero");
      const cuotas = cs ?? [];
      if (!cuotas.length) throw new AdminActionError("Este cliente no tiene cuotas generadas.");
      const vencidas = cuotas.filter((c) => !c.pagada && String(c.vencimiento) < hoy);
      if (vencidas.length)
        throw new AdminActionError(
          `No se puede emitir: tiene ${vencidas.length} cuota${vencidas.length === 1 ? "" : "s"} vencida${vencidas.length === 1 ? "" : "s"} sin pagar (desde el ${fechaAr(String(vencidas[0].vencimiento))}).`
        );
      const pagadas = cuotas.filter((c) => c.pagada);
      const total = cuotas.length;
      const proxima = cuotas.find((c) => !c.pagada);
      const ultima = [...pagadas].sort((x, y) => String(x.pagado_en ?? "").localeCompare(String(y.pagado_en ?? ""))).pop();
      type LoteRaw = { manzana: string | null; numero: string | null };
      const varios = ((l.lead_lotes ?? []) as unknown as { lotes: LoteRaw | null }[]).map((x) => x.lotes).filter((x): x is LoteRaw => !!x);
      const lotes = varios.length ? varios : l.lotes ? [l.lotes as unknown as LoteRaw] : [];
      const proyecto = (l.proyectos as unknown as { nombre: string } | null)?.nombre;
      const inmueble =
        [lotes.map((x) => `el Lote ${x.numero} de la Manzana ${x.manzana ?? l.manzana ?? ""}`).join(" y "), proyecto ? `del desarrollo ${proyecto}` : ""]
          .filter(Boolean)
          .join(" ") || (proyecto ?? "su lote");
      const datos: DatosLibreDeuda = {
        origen: "lote",
        inmueble,
        alDia: hoy,
        cancelacionTotal: pagadas.length === total,
        detalle: [
          `Cuotas abonadas: ${pagadas.length} de ${total}.`,
          ...(ultima ? [`Última cuota abonada: N.º ${ultima.numero}${ultima.pagado_en ? `, el ${fechaAr(String(ultima.pagado_en))}` : ""}.`] : []),
          ...(proxima ? [`Próximo vencimiento: cuota N.º ${proxima.numero}, el ${fechaAr(String(proxima.vencimiento))}.`] : []),
        ],
      };
      base = {
        tipo: "libre_deuda",
        leadId: d.id,
        alqContratoId: null,
        clienteNombre: [l.nombre, l.apellido].filter(Boolean).join(" "),
        clienteEmail: (l.email as string) || null,
        clienteTelefono: (l.telefono as string) || null,
        clienteDni: (l.dni as string) || null,
        datos,
        aceptaHabilitada: false,
        venceEn: null,
      };
    } else {
      const { data: c } = await a.from("alq_contratos").select("*").eq("id", d.id).maybeSingle();
      if (!c) throw new AdminActionError("No se encontró el contrato.");
      const { data: inq } = await a.from("alq_personas").select("*").eq("id", c.inquilino_id).maybeSingle();
      const [{ data: qs }, { data: ss }] = await Promise.all([
        a.from("alq_cuotas").select("periodo, vencimiento, pagado_en").eq("contrato_id", d.id).order("periodo"),
        a.from("alq_servicios").select("concepto, a_cargo, vencimiento, pagado").eq("contrato_id", d.id),
      ]);
      const impagas = (qs ?? []).filter((q) => !q.pagado_en && String(q.vencimiento) < hoy);
      if (impagas.length)
        throw new AdminActionError(
          `No se puede emitir: tiene ${impagas.length} mes${impagas.length === 1 ? "" : "es"} de alquiler vencido${impagas.length === 1 ? "" : "s"} sin pagar (${impagas
            .map((q) => nombrePeriodo(String(q.periodo)))
            .join(", ")}).`
        );
      const servicios = (ss ?? []).filter((s) => s.a_cargo === "inquilino" && !s.pagado && s.vencimiento && String(s.vencimiento) < hoy);
      if (servicios.length)
        throw new AdminActionError(`No se puede emitir: tiene servicios a su cargo vencidos sin pagar (${servicios.map((s) => s.concepto).join(", ")}).`);
      const pagos = (qs ?? []).filter((q) => q.pagado_en);
      const ultimo = pagos[pagos.length - 1];
      const datos: DatosLibreDeuda = {
        origen: "alquiler",
        inmueble: [c.direccion, c.localidad].filter(Boolean).join(", "),
        alDia: hoy,
        cancelacionTotal: false,
        detalle: [
          `Contrato de locación vigente del ${fechaAr(String(c.fecha_inicio))} al ${fechaAr(String(c.fecha_fin))}.`,
          ...(ultimo ? [`Último período abonado: ${nombrePeriodo(String(ultimo.periodo))} (pagado el ${fechaAr(String(ultimo.pagado_en))}).`] : []),
        ],
      };
      base = {
        tipo: "libre_deuda",
        leadId: null,
        alqContratoId: d.id,
        clienteNombre: (inq?.nombre as string) ?? "Inquilino",
        clienteEmail: (inq?.email as string) || null,
        clienteTelefono: (inq?.telefono as string) || null,
        clienteDni: (inq?.dni as string) || null,
        datos,
        aceptaHabilitada: false,
        venceEn: null,
      };
    }

    const doc = await emitir(a, perfil.email, base);
    await registrarActividad(perfil, "emitir", "documento_cliente", doc.id, { numero: doc.numero, cliente: doc.clienteNombre });
    refrescar();
    return { ok: true, id: doc.id, numero: doc.numero };
  } catch (err) {
    return fail(err);
  }
}

/* ───────────── Envíos y links ───────────── */

/** Link y QR de pago para incluir en los envíos (solo reservas con pago pendiente y en pesos). */
async function datosPago(a: SupabaseClient, doc: DocEmitido, actor: string) {
  if (doc.tipo !== "reserva" || doc.pagoEstado === "abonado" || !admitePagoMp(doc)) return null;
  const link = await asegurarLinkPagoReserva(a, doc, actor);
  return link ? { link, qr: urlQrPago(doc), monto: monto((doc.datos as DatosReserva).importeReserva, "ARS") } : null;
}

function asegurarActivo(doc: DocEmitido) {
  if (doc.estado === "anulado") throw new AdminActionError("El documento está anulado.");
}

async function marcarEnviado(a: SupabaseClient, doc: DocEmitido) {
  if (doc.estado === "emitido") await a.from("doc_emitidos").update({ estado: "enviado" }).eq("id", doc.id).eq("estado", "emitido");
}

export async function enviarEmailDocAction(
  id: string,
  opciones: { mensaje?: string; adjuntar?: boolean; dias?: number }
): Promise<R<{ aviso: string }>> {
  try {
    const { perfil, a } = await contexto();
    const doc = await cargarDoc(a, id);
    asegurarActivo(doc);
    if (!doc.clienteEmail) throw new AdminActionError("El cliente no tiene email cargado en este documento.");
    const link = await crearLink(a, id, { canal: "email", dias: opciones.dias ?? 30, actor: perfil.email });
    const pago = await datosPago(a, doc, perfil.email);
    const { asunto, html } = mailEnvioDocumento(doc, link.url, t(opciones.mensaje, 2000), link.venceEn, pago);
    const pdf = opciones.adjuntar !== false ? await leerPdf(a, doc) : null;
    try {
      const r = await sendEmail(doc.clienteEmail, asunto, html, pdf ? [{ filename: `${doc.numero}.pdf`, content: pdf.toString("base64") }] : undefined);
      if ("skipped" in r && r.skipped) {
        await registrarEvento(a, id, "email_error", { a: doc.clienteEmail, error: "El envío de mails no está configurado (RESEND_API_KEY)." }, perfil.email);
        throw new AdminActionError("El envío de mails no está configurado en el sitio (falta RESEND_API_KEY).");
      }
    } catch (err) {
      if (err instanceof AdminActionError) throw err;
      const msg = err instanceof Error ? err.message : String(err);
      await registrarEvento(a, id, "email_error", { a: doc.clienteEmail, error: msg.slice(0, 500) }, perfil.email);
      throw new AdminActionError(`No se pudo enviar el mail: ${msg.slice(0, 200)}`);
    }
    await registrarEvento(a, id, "email_enviado", { a: doc.clienteEmail, adjunto: !!pdf, linkId: link.linkId }, perfil.email);
    await marcarEnviado(a, doc);
    refrescar();
    return { ok: true, aviso: `Enviado a ${doc.clienteEmail}${pdf ? " con el PDF adjunto" : ""}.` };
  } catch (err) {
    return fail(err);
  }
}

export async function whatsappDocAction(id: string, dias = 30): Promise<R<{ url: string; link: string }>> {
  try {
    const { perfil, a } = await contexto();
    const doc = await cargarDoc(a, id);
    asegurarActivo(doc);
    const link = await crearLink(a, id, { canal: "whatsapp", dias, actor: perfil.email });
    const pago = await datosPago(a, doc, perfil.email);
    const texto = mensajeWhatsappDocumento(doc, link.url, pago?.link ?? null);
    const url = doc.clienteTelefono
      ? buildWhatsappClienteUrl(doc.clienteTelefono, texto)
      : `https://wa.me/?text=${encodeURIComponent(texto)}`;
    await registrarEvento(a, id, "whatsapp_preparado", { a: doc.clienteTelefono, linkId: link.linkId }, perfil.email);
    await marcarEnviado(a, doc);
    refrescar();
    return { ok: true, url, link: link.url };
  } catch (err) {
    return fail(err);
  }
}

export async function nuevoLinkDocAction(id: string, dias = 30): Promise<R<{ link: string; venceEn: string }>> {
  try {
    const { perfil, a } = await contexto();
    const doc = await cargarDoc(a, id);
    asegurarActivo(doc);
    const link = await crearLink(a, id, { canal: "copia", dias, actor: perfil.email });
    refrescar();
    return { ok: true, link: link.url, venceEn: link.venceEn };
  } catch (err) {
    return fail(err);
  }
}

export async function revocarLinkAction(linkId: string): Promise<R> {
  try {
    const { perfil, a } = await contexto();
    const { data } = await a.from("doc_links").update({ revocado_en: new Date().toISOString() }).eq("id", linkId).is("revocado_en", null).select("documento_id").maybeSingle();
    if (data) await registrarEvento(a, data.documento_id as string, "link_revocado", { linkId }, perfil.email);
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function revocarTodosLinksAction(id: string): Promise<R<{ cantidad: number }>> {
  try {
    const { perfil, a } = await contexto();
    const { data } = await a.from("doc_links").update({ revocado_en: new Date().toISOString() }).eq("documento_id", id).is("revocado_en", null).select("id");
    await registrarEvento(a, id, "links_revocados", { cantidad: data?.length ?? 0 }, perfil.email);
    refrescar();
    return { ok: true, cantidad: data?.length ?? 0 };
  } catch (err) {
    return fail(err);
  }
}

export async function anularDocAction(id: string, motivo: string): Promise<R> {
  try {
    const { perfil, a } = await contexto();
    const doc = await cargarDoc(a, id);
    if (doc.estado === "anulado") throw new AdminActionError("Ya estaba anulado.");
    const ahora = new Date().toISOString();
    await a.from("doc_emitidos").update({ estado: "anulado", anulado_en: ahora, anulado_motivo: t(motivo, 500) }).eq("id", id);
    await a.from("doc_links").update({ revocado_en: ahora }).eq("documento_id", id).is("revocado_en", null);
    await registrarEvento(a, id, "anulado", { motivo: t(motivo, 500) }, perfil.email);
    await registrarActividad(perfil, "anular", "documento_cliente", id, { numero: doc.numero, motivo });
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

/** Resumen de una reserva en texto (para la vista del panel). */
export async function resumenDoc(doc: DocEmitido): Promise<string> {
  if (doc.tipo === "reserva") {
    const r = doc.datos as DatosReserva;
    return `${r.inmueble} · reserva ${monto(r.importeReserva, r.monedaReserva)}${r.valorVenta ? ` · valor ${monto(r.valorVenta, r.monedaVenta)}` : ""}`;
  }
  const l = doc.datos as DatosLibreDeuda;
  return `${l.inmueble} · al ${fechaAr(l.alDia)}`;
}

export async function nombreTipo(tipo: TipoDoc) {
  return NOMBRE_TIPO[tipo];
}

/* ───────────── Pago de la reserva ───────────── */

export async function generarLinkPagoAction(id: string): Promise<R<{ link: string }>> {
  try {
    const { perfil, a } = await contexto();
    const doc = await cargarDoc(a, id);
    asegurarActivo(doc);
    if (doc.tipo !== "reserva") throw new AdminActionError("Solo las reservas tienen pago.");
    if (!admitePagoMp(doc)) throw new AdminActionError("Mercado Pago solo cobra en pesos: esta reserva está en dólares.");
    const link = await asegurarLinkPagoReserva(a, doc, perfil.email);
    if (!link) throw new AdminActionError("No se pudo crear el link de Mercado Pago. Revisá la configuración de Mercado Pago.");
    refrescar();
    return { ok: true, link };
  } catch (err) {
    return fail(err);
  }
}

export async function marcarPagoReservaAction(id: string, estado: "pendiente" | "abonado", medio?: string): Promise<R> {
  try {
    const { perfil, a } = await contexto();
    const doc = await cargarDoc(a, id);
    if (doc.tipo !== "reserva") throw new AdminActionError("Solo las reservas tienen pago.");
    const fila =
      estado === "abonado"
        ? {
            pago_estado: "abonado",
            pago_medio: ["efectivo", "transferencia", "mercadopago"].includes(medio ?? "") ? medio : "transferencia",
            pago_monto: (doc.datos as DatosReserva).importeReserva,
            pago_en: new Date().toISOString(),
          }
        : { pago_estado: "pendiente", pago_medio: null, pago_monto: null, pago_en: null, pago_mp_id: null };
    await a.from("doc_emitidos").update(fila).eq("id", id);
    await registrarEvento(a, id, estado === "abonado" ? "pago_manual" : "pago_revertido", estado === "abonado" ? { medio: fila.pago_medio } : {}, perfil.email);
    refrescar();
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
