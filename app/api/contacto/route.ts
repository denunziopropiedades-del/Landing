import { NextResponse } from "next/server";
import { contactoSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = contactoSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const supabase = await getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("leads").insert({
      tipo: "contacto",
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      mensaje: data.mensaje,
      estado: "nuevo",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try {
    await sendNotificationEmail(
      `Nueva consulta de ${data.nombre}`,
      `<h2>Nueva consulta desde el formulario de contacto</h2>
       <ul>
         <li><b>Nombre:</b> ${data.nombre}</li>
         <li><b>Email:</b> ${data.email}</li>
         <li><b>Teléfono:</b> ${data.telefono}</li>
       </ul>
       <p><b>Mensaje:</b> ${data.mensaje}</p>`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de notificación", err);
  }

  return NextResponse.json({ ok: true });
}
