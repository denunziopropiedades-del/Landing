import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { reenviarMailVisita } from "@/lib/visitas-mail";

export const runtime = "nodejs";

/** TEMPORAL, solo preview: reenvía el mail con la ubicación a Luis Morinigo. */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") return new NextResponse("No", { status: 404 });
  const a = await getSupabaseAdminClient();
  if (!a) return NextResponse.json({ error: "sin db" });
  return NextResponse.json(await reenviarMailVisita(a, "6fd6b6b5-5f5f-49f7-8582-c73f05090374"));
}
