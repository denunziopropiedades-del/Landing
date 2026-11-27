import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { correrSeguimientos } from "@/lib/asistente/motor";

export const runtime = "nodejs";
export const maxDuration = 300;

/** Seguimientos del asistente de IA a quienes dejaron de responder (una vez por día). */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const autorizado =
    !process.env.CRON_SECRET || auth === `Bearer ${process.env.CRON_SECRET}` || searchParams.get("secret") === process.env.CRON_SECRET;
  if (!autorizado) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const supabase = await getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true, motivo: "Supabase no configurado" });

  const r = await correrSeguimientos(supabase, request.headers.get("x-vercel-oidc-token"));
  return NextResponse.json({ ok: true, ...r });
}
