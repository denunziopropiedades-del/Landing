import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getLeads } from "@/lib/admin/data";

export const runtime = "nodejs";

function csvCell(valor: string) {
  if (/[",\n]/.test(valor)) return `"${valor.replace(/"/g, '""')}"`;
  return valor;
}

/**
 * Lleva el teléfono a formato internacional argentino (549 + área + número),
 * que es como Meta lo matchea mejor. Si no se puede inferir, deja solo dígitos.
 */
function telefonoMeta(telefono: string) {
  let d = telefono.replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("54")) {
    d = d.slice(2);
    if (d.startsWith("9")) d = d.slice(1);
  }
  if (d.startsWith("0")) d = d.slice(1);
  // Celular de AMBA cargado como 15XXXXXXXX → 11XXXXXXXX
  if (d.length === 10 && d.startsWith("15")) d = `11${d.slice(2)}`;
  if (d.length === 10) return `549${d}`;
  return d;
}

function separarNombre(nombre: string, apellido?: string | null) {
  if (apellido?.trim()) return { fn: nombre.trim(), ln: apellido.trim() };
  const partes = nombre.trim().split(/\s+/);
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
  const estado = searchParams.get("estado");
  const tipo = searchParams.get("tipo");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  let leads = await getLeads();

  if (proyectoId) leads = leads.filter((l) => l.proyectoId === proyectoId);
  if (estado) leads = leads.filter((l) => l.estado === estado);
  if (tipo) leads = leads.filter((l) => l.tipo === tipo);
  if (desde) leads = leads.filter((l) => l.creadoEn >= desde);
  if (hasta) leads = leads.filter((l) => l.creadoEn <= `${hasta}T23:59:59`);

  // Sin duplicados: un mismo contacto que escribió varias veces va una sola vez.
  const vistos = new Set<string>();
  const filas: string[] = [];
  for (const l of leads) {
    const email = (l.email ?? "").trim().toLowerCase();
    const phone = telefonoMeta(l.telefono ?? "");
    if (!email && !phone) continue;
    const clave = email || phone;
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    const { fn, ln } = separarNombre(l.nombre ?? "", l.apellido);
    filas.push([email, phone, fn, ln, "ar"].map(csvCell).join(","));
  }

  const csv = ["email,phone,fn,ln,country", ...filas].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contactos-meta-${Date.now()}.csv"`,
    },
  });
}
