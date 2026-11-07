import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { actualizarLugarEventoVisita } from "@/lib/google-calendar";
import { mapPropiedad, ubicacionTexto } from "@/lib/propiedades-base";

export const runtime = "nodejs";

/** TEMPORAL, solo preview: agrega el lugar a los eventos de las visitas próximas ya creadas. */
export async function GET() {
  if (process.env.VERCEL_ENV === "production") return new NextResponse("No", { status: 404 });
  const a = await getSupabaseAdminClient();
  if (!a) return NextResponse.json({ error: "sin db" });
  const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
  const { data: vs } = await a
    .from("visitas")
    .select("id, nombre, email, telefono, google_event_id, propiedad_id, proyectos(nombre, ubicacion, ubicacion_maps_url)")
    .in("estado", ["pendiente", "confirmada"])
    .gte("fecha", hoy)
    .not("google_event_id", "is", null);
  const resultados: { lugar: string; ok: boolean }[] = [];
  for (const v of vs ?? []) {
    let nombre: string | undefined;
    let ubicacion: string | null = null;
    let maps: string | null = null;
    const p = v.proyectos as unknown as { nombre: string; ubicacion: string | null; ubicacion_maps_url: string | null } | null;
    if (v.propiedad_id) {
      const { data: prop } = await a.from("propiedades").select("*").eq("id", v.propiedad_id).maybeSingle();
      if (prop) {
        const pr = mapPropiedad(prop);
        nombre = pr.titulo;
        ubicacion = [pr.direccion && !/^https?:\/\//i.test(pr.direccion) ? pr.direccion : null, ubicacionTexto(pr)].filter(Boolean).join(", ");
        maps = pr.mapsUrl ?? (pr.direccion && /^https?:\/\//i.test(pr.direccion) ? pr.direccion : null);
      }
    }
    if (!nombre && p) {
      nombre = p.nombre;
      ubicacion = p.ubicacion;
      maps = p.ubicacion_maps_url;
    }
    const ok = await actualizarLugarEventoVisita(v.google_event_id as string, {
      nombre: v.nombre as string,
      email: v.email as string,
      telefono: v.telefono as string,
      proyectoNombre: nombre,
      ubicacion,
      mapsUrl: maps,
    });
    resultados.push({ lugar: nombre ?? "(sin lugar)", ok });
  }
  return NextResponse.json({ ok: true, resultados });
}
