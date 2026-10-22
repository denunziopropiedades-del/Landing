import { NextResponse } from "next/server";
import { consultaPropiedadSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { formatearPrecio, labelTipo, mapPropiedad, ubicacionTexto, type TipoPropiedad } from "@/lib/propiedades";
import { nombrePartido } from "@/lib/zonas";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Consultas desde la ficha de una propiedad y pedidos de tasación: quedan como lead en el CRM. */
export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "contacto");
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const parsed = consultaPropiedadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisá los datos: nombre, mail y teléfono son obligatorios." }, { status: 400 });
  }
  const data = parsed.data;
  const supabase = await getSupabaseAdminClient();

  let resumen = "";
  let asunto = "";
  if (data.tasacion) {
    const t = data.tasacion;
    const op = t.operacion === "ambas" ? "venta o alquiler" : t.operacion;
    resumen = `🏷️ Pide TASACIÓN para ${op}: ${labelTipo(t.tipo as TipoPropiedad)} en ${nombrePartido(t.partido)}${t.direccion ? ` (${t.direccion})` : ""}.`;
    asunto = `Pedido de tasación: ${data.nombre} — ${nombrePartido(t.partido)}`;
  } else if (data.propiedadId && supabase) {
    const { data: prop } = await supabase.from("propiedades").select("*").eq("id", data.propiedadId).maybeSingle();
    if (prop) {
      const p = mapPropiedad(prop);
      resumen = `🏠 Consulta por "${p.titulo}" (${p.operacion}, ${ubicacionTexto(p)}, ${formatearPrecio(p)}).`;
      asunto = `Consulta por ${p.titulo}: ${data.nombre}`;
    }
  }
  if (!asunto) {
    resumen = "Consulta desde el portal de propiedades.";
    asunto = `Nueva consulta de ${data.nombre}`;
  }

  if (supabase) {
    const fila = {
      tipo: "contacto",
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      mensaje: data.mensaje ?? "",
      observaciones: [resumen, data.mensaje ? `Mensaje: ${data.mensaje}` : null].filter(Boolean).join("\n"),
      estado: "nuevo",
    };
    let { error } = await supabase
      .from("leads")
      .insert(data.propiedadId ? { ...fila, propiedad_id: data.propiedadId } : fila);
    // Si todavía no se corrió sql-propiedades.sql, la columna propiedad_id no existe: se guarda sin ella.
    if (error && data.propiedadId) ({ error } = await supabase.from("leads").insert(fila));
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  try {
    await sendNotificationEmail(
      asunto,
      `<h2>${esc(asunto)}</h2>
       <p>${esc(resumen)}</p>
       <ul>
         <li><b>Nombre:</b> ${esc(data.nombre)}</li>
         <li><b>Email:</b> ${esc(data.email)}</li>
         <li><b>Teléfono:</b> ${esc(data.telefono)}</li>
       </ul>
       ${data.mensaje ? `<p><b>Mensaje:</b> ${esc(data.mensaje)}</p>` : ""}`
    );
  } catch (err) {
    console.error("No se pudo enviar el aviso de consulta", err);
  }

  return NextResponse.json({ ok: true });
}
