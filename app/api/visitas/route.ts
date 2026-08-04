import { NextResponse } from "next/server";
import { visitaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "visitas");
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = visitaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  const supabase = await getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("visitas").insert({
      proyecto_id: data.proyectoId || null,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      fecha: data.fecha,
      horario: data.horario,
      estado: "pendiente",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try {
    await sendNotificationEmail(
      `Nueva visita agendada: ${data.nombre} — ${data.fecha} ${data.horario}`,
      `<h2>Nueva visita coordinada desde la web</h2>
       <ul>
         <li><b>Nombre:</b> ${data.nombre}</li>
         <li><b>Email:</b> ${data.email}</li>
         <li><b>Teléfono:</b> ${data.telefono}</li>
         <li><b>Fecha:</b> ${data.fecha}</li>
         <li><b>Horario:</b> ${data.horario}</li>
       </ul>`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de notificación", err);
  }

  return NextResponse.json({ ok: true });
}
