import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getPerfilActual } from "@/lib/admin/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { oauthConfigurado, redirectUri } from "@/lib/google-contactos";

export const runtime = "nodejs";

/** Vuelta de Google: guarda el permiso (refresh token) para crear contactos. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const volver = (estado: string) => NextResponse.redirect(new URL(`/admin/crm?contactos=${estado}`, url.origin));
  const perfil = await getPerfilActual();
  if (!perfil || perfil.rol !== "administrador") return new NextResponse("No autorizado", { status: 401 });
  if (!oauthConfigurado()) return volver("sin-configurar");
  const state = (await cookies()).get("gc_state")?.value;
  if (!state || state !== url.searchParams.get("state")) return volver("error-estado");
  const code = url.searchParams.get("code");
  if (!code) return volver("cancelado");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    console.error("Google Contactos: error al canjear el código", await res.text());
    return volver("error");
  }
  const j = (await res.json()) as { refresh_token?: string; id_token?: string };
  if (!j.refresh_token) return volver("sin-permiso");
  let cuenta: string | null = null;
  try {
    const payload = JSON.parse(Buffer.from(String(j.id_token).split(".")[1], "base64url").toString());
    cuenta = payload.email ?? null;
  } catch {
    /* sin email */
  }
  const a = await getSupabaseAdminClient();
  await a!.from("google_contactos_config").upsert({ id: 1, refresh_token: j.refresh_token, cuenta_email: cuenta, conectado_en: new Date().toISOString() });
  return volver("ok");
}
