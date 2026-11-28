import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { GRAPH, META_APP_ID } from "@/lib/mensajeria";
import { tokenPagina } from "@/lib/meta-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico del token de la página (META_PAGE_ACCESS_TOKEN): tipo, permisos, vencimiento
 * y si puede leer el nombre de quien escribe por Messenger. Solo administradores.
 * No muestra el token.
 */
export async function GET() {
  const perfil = await getPerfilActual();
  if (!perfil || perfil.rol !== "administrador") return NextResponse.json({ error: "Solo administradores" }, { status: 403 });

  const base = process.env.META_PAGE_ACCESS_TOKEN;
  const token = await tokenPagina();
  const secret = process.env.META_APP_SECRET;
  if (!token) return NextResponse.json({ error: "Falta META_PAGE_ACCESS_TOKEN" });

  const salida: Record<string, unknown> = { tokenCargado: base ? "usuario del sistema o página" : "falta", seConvirtioATokenDePagina: token !== base };
  const q = (u: string) => fetch(u).then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => ({})) }));

  if (secret) {
    const d = await q(`${GRAPH}/debug_token?input_token=${encodeURIComponent(token)}&access_token=${encodeURIComponent(`${META_APP_ID}|${secret}`)}`);
    const data = (d.json as { data?: Record<string, unknown> }).data ?? d.json;
    salida.token = {
      valido: data.is_valid,
      tipo: data.type,
      pagina: data.profile_id,
      vence: data.expires_at ? (data.expires_at === 0 ? "nunca" : new Date(Number(data.expires_at) * 1000).toISOString()) : "nunca",
      permisos: data.scopes,
      error: (data as { error?: unknown }).error,
    };
  }

  const yo = await q(`${GRAPH}/me?fields=id,name&access_token=${encodeURIComponent(token)}`);
  salida.me = yo.json;

  const admin = await getSupabaseAdminClient();
  const { data: conv } = admin
    ? await admin
        .from("conversaciones")
        .select("contacto_id, canal:mensajes_canales!conversaciones_canal_id_fkey(tipo)")
        .order("ultimo_mensaje_en", { ascending: false })
        .limit(30)
    : { data: [] };
  const msg = (conv ?? []).find((c) => {
    const canal = (Array.isArray(c.canal) ? c.canal[0] : c.canal) as { tipo?: string } | null;
    return canal?.tipo === "messenger";
  });
  if (msg) {
    const psid = msg.contacto_id as string;
    salida.perfil = (await q(`${GRAPH}/${psid}?fields=name,first_name,last_name&access_token=${encodeURIComponent(token)}`)).json;
    salida.conversacion = (
      await q(`${GRAPH}/me/conversations?platform=messenger&user_id=${psid}&fields=participants&access_token=${encodeURIComponent(token)}`)
    ).json;
  }
  return NextResponse.json(salida, { headers: { "Cache-Control": "no-store" } });
}
