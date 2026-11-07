import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { getPerfilActual } from "@/lib/admin/auth";
import { SCOPES_CONTACTOS, oauthConfigurado, redirectUri } from "@/lib/google-contactos";

export const runtime = "nodejs";

/** Inicia la autorización de Google Contactos (solo administrador). */
export async function GET() {
  const perfil = await getPerfilActual();
  if (!perfil || perfil.rol !== "administrador") return new NextResponse("No autorizado", { status: 401 });
  if (!oauthConfigurado()) return new NextResponse("Falta configurar GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET.", { status: 503 });
  const state = randomBytes(24).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: SCOPES_CONTACTOS.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  }).toString();
  const res = NextResponse.redirect(url.toString());
  res.cookies.set("gc_state", state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/google/contactos", maxAge: 600 });
  return res;
}
