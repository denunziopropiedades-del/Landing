import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { credenciales, leerConfig } from "@/lib/arca/config";
import { authArca, emitirFactura } from "@/lib/arca/facturas";
import { cotizacion, puntosDeVenta, ultimoAutorizado } from "@/lib/arca/wsfe";

export const runtime = "nodejs";

/**
 * Prueba la conexión con ARCA sin emitir nada: login (WSAA), puntos de venta,
 * último comprobante y cotización del dólar. Acceso: admin logueado o ?token=ARCA_DIAG_TOKEN.
 */
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  const diag = process.env.ARCA_DIAG_TOKEN;
  const perfil = token && diag && token === diag ? null : await getPerfilActual();
  if (!(token && diag && token === diag) && (!perfil || perfil.rol !== "administrador")) {
    return NextResponse.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }
  const a = await getSupabaseAdminClient();
  if (!a) return NextResponse.json({ ok: false, error: "Supabase no configurado" }, { status: 503 });

  const config = await leerConfig(a);
  const { cert, key } = credenciales(config.entorno);
  const pasos: Record<string, unknown> = {
    entorno: config.entorno,
    cuit: config.cuit,
    puntoVenta: config.puntoVenta,
    certificado: !!cert,
    clavePrivada: !!key,
  };
  try {
    const auth = await authArca(a, config);
    pasos.login = "ok";
    try {
      pasos.puntosDeVenta = await puntosDeVenta(auth);
    } catch (e) {
      pasos.puntosDeVenta = (e as Error).message;
    }
    pasos.ultimaFacturaC = await ultimoAutorizado(auth, config.puntoVenta, 11);
    pasos.ultimaNotaCreditoC = await ultimoAutorizado(auth, config.puntoVenta, 13);
    pasos.cotizacionDolar = await cotizacion(auth, "DOL");

    // ?probar=PES|DOL: emite una factura de PRUEBA (solo en homologación, nunca en producción).
    const probar = new URL(request.url).searchParams.get("probar");
    if (probar && config.entorno === "homologacion") {
      const moneda = probar === "DOL" ? "DOL" : "PES";
      const importe = moneda === "DOL" ? 20 : 150000;
      const { data: f, error } = await a
        .from("arca_facturas")
        .insert({
          origen: "otro",
          entorno: "homologacion",
          punto_venta: config.puntoVenta,
          receptor_doc_tipo: 96,
          receptor_doc_nro: "30123456",
          receptor_nombre: "CLIENTE DE PRUEBA",
          receptor_condicion_iva: 5,
          moneda,
          cancela_misma_moneda: true,
          items: [
            {
              descripcion: moneda === "DOL" ? "Honorarios profesionales · gestión de cobranza" : "Seña / reserva",
              detalle: moneda === "DOL" ? "Cuota 5 de 36 · Mz. 3 · Ayres de Guernica Etapa 2 (PRUEBA)" : "Lote 12, Mz. 3 · Ayres de Guernica Etapa 2 (PRUEBA)",
              cantidad: 1,
              precio: importe,
            },
          ],
          importe_total: importe,
          medio_pago: "transferencia",
          creado_por: "diagnostico",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const res = await emitirFactura(a, f.id as string, "diagnostico");
      pasos.prueba = res.ok
        ? { ok: true, numero: res.factura.numero, cae: res.factura.cae, caeVto: res.factura.caeVto, pdf: `/api/factura/${res.factura.tokenPublico}` }
        : { ok: false, error: res.error };
    }
    return NextResponse.json({ ok: true, ...pasos });
  } catch (err) {
    return NextResponse.json({ ok: false, ...pasos, error: (err as Error).message });
  }
}
