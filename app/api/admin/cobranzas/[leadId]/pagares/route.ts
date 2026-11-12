import { NextResponse } from "next/server";
import { getSupabaseAdminClient, getSupabaseServerClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { generarPagaresPdf, type DatosPagares, type TipoDocBeneficiario } from "@/lib/pagares/pdf";
import { mapDoc, type DatosReserva } from "@/lib/docs-clientes/compartido";
import type { PlanFinanciacionFijo } from "@/types/site";

export const runtime = "nodejs";

const EMISOR =
  "Documento emitido por DE NUNZIO NEGOCIOS INMOBILIARIOS — Matías De Nunzio, Martillero Público y Corredor Inmobiliario, Mat. COL 7886 — en carácter de gestor de cobranza.";

const limpiar = (v: string | null, max = 160) => (v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** 20301234567 → 20-30123456-7 */
function formatearCuit(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0, 2)}-${d.slice(2, 10)}-${d.slice(10)}` : v.trim();
}

function formatearDni(v: string | null) {
  const d = (v ?? "").replace(/\D/g, "");
  return d.length >= 7 && d.length <= 8 ? Number(d).toLocaleString("es-AR") : v?.trim() || null;
}

/**
 * Pagarés de las cuotas de un cliente financiado: un PDF con una cuota por hoja.
 * GET /api/admin/cobranzas/:leadId/pagares?beneficiario=…&tipoDoc=CUIT|CUIL&doc=…&lugarPago=…
 *   &lugarEmision=…&fecha=YYYY-MM-DD&cuotas=pendientes|todas&aval=1
 */
export async function GET(request: Request, { params }: { params: Promise<{ leadId: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "supervisor"].includes(perfil.rol)) return new NextResponse("No autorizado", { status: 401 });

  const { leadId } = await params;
  const q = new URL(request.url).searchParams;
  const beneficiario = limpiar(q.get("beneficiario"), 120);
  const tipoDoc: TipoDocBeneficiario = q.get("tipoDoc") === "CUIL" ? "CUIL" : "CUIT";
  const numeroDoc = formatearCuit(limpiar(q.get("doc"), 20));
  const lugarPago = limpiar(q.get("lugarPago"), 160);
  const lugarEmision = limpiar(q.get("lugarEmision"), 100) || "San Vicente, Provincia de Buenos Aires";
  const fechaEmision = /^\d{4}-\d{2}-\d{2}$/.test(q.get("fecha") ?? "")
    ? (q.get("fecha") as string)
    : new Date().toLocaleDateString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" });
  const soloPendientes = q.get("cuotas") !== "todas";
  const incluirAval = q.get("aval") === "1";

  if (!beneficiario || !numeroDoc || !lugarPago) {
    return new NextResponse("Faltan datos del beneficiario, su CUIT/CUIL o el lugar de pago.", { status: 400 });
  }

  const supabase = await getSupabaseServerClient();
  if (!supabase) return new NextResponse("No disponible", { status: 503 });

  const { data: l, error } = await supabase
    .from("leads")
    .select(
      `id, nombre, apellido, dni, email, telefono, manzana, plan_financiacion,
       importe_cobrado, numero_transaccion, pago_confirmado_en,
       proyectos(nombre),
       lotes(numero, manzana),
       lead_lotes(lotes(numero, manzana)),
       cuotas(id, numero, monto_usd, vencimiento, pagada)`
    )
    .eq("id", leadId)
    .maybeSingle();
  if (error || !l) return new NextResponse("Cliente no encontrado", { status: 404 });

  // Domicilio y CUIT/CUIL que cargó el cliente en /alta (consulta aparte: la columna puede no existir).
  let dc: Record<string, string | null> | null = null;
  const { data: dcRow } = await supabase.from("leads").select("datos_contrato").eq("id", leadId).maybeSingle();
  if (dcRow && (dcRow as { datos_contrato?: unknown }).datos_contrato) dc = (dcRow as { datos_contrato: Record<string, string | null> }).datos_contrato;

  const plan = (l.plan_financiacion as PlanFinanciacionFijo | null) ?? null;
  const moneda: "USD" | "ARS" = plan?.moneda === "ARS" ? "ARS" : "USD";

  const todas = ((l.cuotas ?? []) as { id: string; numero: number; monto_usd: number; vencimiento: string; pagada: boolean }[])
    .slice()
    .sort((a, b) => a.numero - b.numero);
  const elegidas = todas.filter((c) => !soloPendientes || !c.pagada);
  if (!elegidas.length) {
    return new NextResponse(soloPendientes ? "Este cliente no tiene cuotas pendientes." : "Este cliente no tiene cuotas generadas.", { status: 400 });
  }

  type LoteMin = { numero: string; manzana: string | null };
  const lotesDirectos = (Array.isArray(l.lotes) ? l.lotes : l.lotes ? [l.lotes] : []) as unknown as LoteMin[];
  const lotesVinculados = ((l.lead_lotes ?? []) as unknown as { lotes: LoteMin | null }[]).map((x) => x.lotes).filter((x): x is LoteMin => !!x);
  const lotes = lotesVinculados.length ? lotesVinculados : lotesDirectos;
  const manzana = (l.manzana as string | null) ?? lotes[0]?.manzana ?? null;

  // Reserva emitida desde "Reservas y certificados": de ahí salen la seña, su pago y el precio
  // de la operación, para que el pagaré muestre lo mismo que la reserva (consulta aparte: si la
  // tabla no existe, se usan los datos de la ficha del CRM).
  const admin = await getSupabaseAdminClient();
  const buscarReserva = async (campo: "lead_id" | "cliente_email", valor: string) => {
    if (!admin) return null;
    let q = admin.from("doc_emitidos").select("*").eq("tipo", "reserva").neq("estado", "anulado");
    q = campo === "lead_id" ? q.eq("lead_id", valor) : q.is("lead_id", null).ilike("cliente_email", valor.replace(/[%_\\]/g, "\\$&"));
    const { data } = await q.order("emitido_en", { ascending: false }).limit(1).maybeSingle();
    return data;
  };
  // Primero la reserva vinculada a la ficha; si no hay, una reserva sin vincular con el mismo email.
  const emailLead = ((l.email as string | null) ?? "").trim();
  const reservaRow = (await buscarReserva("lead_id", leadId)) ?? (emailLead ? await buscarReserva("cliente_email", emailLead) : null);
  const reserva = reservaRow ? mapDoc(reservaRow) : null;
  const datosReserva = reserva ? (reserva.datos as DatosReserva) : null;

  const domicilio = dc ? [dc.domicilio, dc.localidad, dc.partido, dc.provincia].filter(Boolean).join(", ") : "";
  const importeSena = Number(l.importe_cobrado) || 0;

  const datos: DatosPagares = {
    beneficiario: { nombre: beneficiario, tipoDoc, numeroDoc },
    lugarPago,
    lugarEmision,
    fechaEmision,
    incluirAval,
    deudor: {
      nombre: `${l.nombre ?? ""} ${l.apellido ?? ""}`.trim(),
      dni: formatearDni(l.dni as string | null),
      cuitCuil: dc?.cuit ? formatearCuit(dc.cuit) : null,
      domicilio: domicilio || null,
      email: (l.email as string | null) || null,
      telefono: (l.telefono as string | null) || null,
    },
    operacion: {
      proyecto: (l.proyectos as unknown as { nombre: string } | null)?.nombre ?? null,
      inmueble: datosReserva?.inmueble ?? null,
      manzana,
      lotes: lotes.map((x) => String(x.numero)),
      totalCuotas: Math.max(plan?.cuotas ?? 0, todas.length),
      precio: datosReserva?.valorVenta ? { importe: datosReserva.valorVenta, moneda: datosReserva.monedaVenta } : null,
      sena: reserva && datosReserva && reserva.pagoEstado === "abonado"
        ? {
            importe: reserva.pagoMonto || datosReserva.importeReserva,
            moneda: datosReserva.monedaReserva,
            fecha: reserva.pagoEn?.slice(0, 10) ?? null,
            comprobante: [`Reserva ${reserva.numero}`, reserva.pagoMpId ? `op. ${reserva.pagoMpId}` : null].filter(Boolean).join(", "),
          }
        : importeSena
        ? {
            importe: importeSena,
            moneda: "ARS",
            fecha: (l.pago_confirmado_en as string | null)?.slice(0, 10) ?? null,
            comprobante: (l.numero_transaccion as string | null) || null,
          }
        : null,
      anticipo: plan?.anticipoUsd ? { importe: plan.anticipoUsd, moneda: plan.monedaAnticipo ?? moneda } : null,
    },
    cuotas: elegidas.map((c) => ({ id: c.id, numero: c.numero, monto: Number(c.monto_usd), moneda, vencimiento: c.vencimiento })),
    emisor: EMISOR,
  };

  const pdf = await generarPagaresPdf(datos);
  const nombreArchivo = `Pagares-${datos.deudor.nombre || "cliente"}`.normalize("NFD").replace(/[^\w-]+/g, "-").replace(/-+/g, "-");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombreArchivo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
