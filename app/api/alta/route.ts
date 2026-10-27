import { NextResponse } from "next/server";
import { altaClienteSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Alta de cliente desde el link público matulotes.app/alta. */
export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "alta", 5);
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiados envíos. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const parsed = altaClienteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const primero = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
    return NextResponse.json({ error: primero ?? "Revisá los datos." }, { status: 400 });
  }
  const d = parsed.data;
  if (d.web) return NextResponse.json({ ok: true }); // bot

  const datosContrato = {
    cuit: d.cuit || null,
    nacionalidad: d.nacionalidad,
    estadoCivil: d.estadoCivil,
    domicilio: d.domicilio,
    localidad: d.localidad,
    partido: d.partido,
    provincia: d.provincia,
  };
  const resumen = [
    "📝 Se dio de alta solo desde el link /alta.",
    `Domicilio: ${d.domicilio}, ${d.localidad}, ${d.partido}, ${d.provincia}`,
    `Nacionalidad: ${d.nacionalidad} · Estado civil: ${d.estadoCivil}${d.cuit ? ` · CUIT/CUIL: ${d.cuit}` : ""}`,
    d.interes ? `Interesado en: ${d.interes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const supabase = await getSupabaseAdminClient();
  if (supabase) {
    const base = {
      tipo: "manual" as const,
      nombre: d.nombre,
      apellido: d.apellido,
      dni: d.dni,
      email: d.email,
      telefono: d.telefono,
      mensaje: d.interes || null,
      observaciones: resumen,
      estado: "nuevo" as const,
    };
    let { error } = await supabase.from("leads").insert({ ...base, datos_contrato: datosContrato });
    // Si todavía no se corrió sql-alta-clientes.sql, se guarda igual (los datos quedan en observaciones).
    if (error && /datos_contrato/.test(error.message)) ({ error } = await supabase.from("leads").insert(base));
    if (error) {
      console.error("alta de cliente", error);
      return NextResponse.json({ error: "No pudimos guardar tus datos. Probá de nuevo." }, { status: 500 });
    }
  }

  try {
    await sendNotificationEmail(
      `Nuevo cliente dado de alta: ${d.nombre} ${d.apellido}`,
      `<h2>Un cliente completó sus datos desde el link de alta</h2>
       <ul>
         <li><b>Nombre:</b> ${esc(d.nombre)} ${esc(d.apellido)}</li>
         <li><b>DNI:</b> ${esc(d.dni)}${d.cuit ? ` · <b>CUIT/CUIL:</b> ${esc(d.cuit)}` : ""}</li>
         <li><b>Email:</b> ${esc(d.email)}</li>
         <li><b>Teléfono:</b> ${esc(d.telefono)}</li>
         <li><b>Nacionalidad:</b> ${esc(d.nacionalidad)} · <b>Estado civil:</b> ${esc(d.estadoCivil)}</li>
         <li><b>Domicilio:</b> ${esc(d.domicilio)}, ${esc(d.localidad)}, ${esc(d.partido)}, ${esc(d.provincia)}</li>
         ${d.interes ? `<li><b>Interesado en:</b> ${esc(d.interes)}</li>` : ""}
       </ul>
       <p>Ya está en el CRM como lead nuevo.</p>`
    );
  } catch (err) {
    console.error("No se pudo enviar el aviso de alta", err);
  }

  return NextResponse.json({ ok: true });
}
