import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { horariosNoDisponibles, verificarTokenReprogramacion } from "@/lib/visitas";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  // Desde el link de reprogramación: el turno actual del propio cliente no cuenta como ocupado.
  const token = searchParams.get("token");
  const excluirVisitaId = token ? (verificarTokenReprogramacion(token) ?? undefined) : undefined;

  if (!fecha) {
    return NextResponse.json({ error: "Falta la fecha" }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ocupados: [] });
  }

  try {
    // Incluye los turnos reservados y los bloqueados por firmas de escribanía (±2 hs).
    const ocupados = await horariosNoDisponibles(supabase, fecha, excluirVisitaId);
    return NextResponse.json({ ocupados });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
