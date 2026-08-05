import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getVisitas } from "@/lib/admin/data";

export const runtime = "nodejs";

function csvCell(valor: string) {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

function soloDigitos(telefono: string) {
  return telefono.replace(/\D/g, "");
}

function separarNombre(nombreCompleto: string) {
  const partes = nombreCompleto.trim().split(/\s+/);
  return { fn: partes[0] ?? "", ln: partes.slice(1).join(" ") };
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = (await supabase?.auth.getUser()) ?? { data: { user: null } };

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const proyectoId = searchParams.get("proyecto");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let visitas = await getVisitas();

  if (proyectoId) visitas = visitas.filter((v) => v.proyectoId === proyectoId);
  if (desde) visitas = visitas.filter((v) => v.creadoEn >= desde);
  if (hasta) visitas = visitas.filter((v) => v.creadoEn <= `${hasta}T23:59:59`);

  const filas = visitas.map((v) => {
    const { fn, ln } = separarNombre(v.nombre);
    return [csvCell(v.email), csvCell(soloDigitos(v.telefono)), csvCell(fn), csvCell(ln)].join(",");
  });

  const csv = ["email,phone,fn,ln", ...filas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitas-meta-${Date.now()}.csv"`,
    },
  });
}
