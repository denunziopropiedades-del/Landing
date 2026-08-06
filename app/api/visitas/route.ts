import { NextResponse } from "next/server";
import { visitaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearEventoVisita } from "@/lib/google-calendar";

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

  let proyectoNombre: string | undefined;
  let visitaId: string | null = null;

  if (supabase) {
    const { data: ocupado } = await supabase
      .from("visitas")
      .select("id")
      .eq("fecha", data.fecha)
      .eq("horario", data.horario)
      .neq("estado", "cancelada")
      .maybeSingle();

    if (ocupado) {
      return NextResponse.json(
        { error: "Ese horario ya fue reservado por otra persona. Elegí otro horario." },
        { status: 409 }
      );
    }

    if (data.proyectoId) {
      const { data: proyecto } = await supabase.from("proyectos").select("nombre").eq("id", data.proyectoId).maybeSingle();
      proyectoNombre = proyecto?.nombre;
    }

    const { data: visita, error } = await supabase
      .from("visitas")
      .insert({
        proyecto_id: data.proyectoId || null,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        fecha: data.fecha,
        horario: data.horario,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ese horario ya fue reservado por otra persona. Elegí otro horario." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    visitaId = visita.id;
  }

  const googleEventId = await crearEventoVisita({
    nombre: data.nombre,
    email: data.email,
    telefono: data.telefono,
    fecha: data.fecha,
    horario: data.horario,
    proyectoNombre,
  });

  if (supabase && visitaId && googleEventId) {
    await supabase.from("visitas").update({ google_event_id: googleEventId }).eq("id", visitaId);
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
