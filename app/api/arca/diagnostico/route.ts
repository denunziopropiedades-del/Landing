import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { credenciales, leerConfig } from "@/lib/arca/config";
import { authArca } from "@/lib/arca/facturas";
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
    return NextResponse.json({ ok: true, ...pasos });
  } catch (err) {
    return NextResponse.json({ ok: false, ...pasos, error: (err as Error).message });
  }
}
