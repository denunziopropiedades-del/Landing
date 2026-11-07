import { NextResponse } from "next/server";
import { oauthConfigurado, sincronizarContactos } from "@/lib/google-contactos";

export const runtime = "nodejs";

/** Red de seguridad diaria: guarda en Google Contactos los clientes nuevos que hayan quedado sin guardar. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  if (!oauthConfigurado()) return NextResponse.json({ ok: true, motivo: "Google Contactos sin configurar" });
  const r = await sincronizarContactos({ soloDesdeConexion: true, limite: 200 });
  return NextResponse.json({ ok: true, ...r });
}
