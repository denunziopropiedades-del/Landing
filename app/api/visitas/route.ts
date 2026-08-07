import { NextResponse } from "next/server";
import { visitaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { NOTA_COORDINACION_VISITA_HTML, NOTA_RESERVA_LOTE_HTML, sendEmail, sendNotificationEmail } from "@/lib/email";
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
  let proyectoUbicacion: string | undefined;
  let proyectoUbicacionMapsUrl: string | undefined;
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
      const { data: proyecto } = await supabase
        .from("proyectos")
        .select("nombre, ubicacion, ubicacion_maps_url")
        .eq("id", data.proyectoId)
        .maybeSingle();
      proyectoNombre = proyecto?.nombre;
      proyectoUbicacion = proyecto?.ubicacion;
      proyectoUbicacionMapsUrl = proyecto?.ubicacion_maps_url ?? undefined;
    }

    const { data: lead, error: errorLead } = await supabase
      .from("leads")
      .insert({
        tipo: "visita",
        proyecto_id: data.proyectoId || null,
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono,
        observaciones: `Visita agendada para el ${data.fecha} a las ${data.horario}.`,
        estado: "visita_programada",
      })
      .select("id")
      .single();
    if (errorLead) {
      return NextResponse.json({ error: errorLead.message }, { status: 500 });
    }

    const { data: visita, error } = await supabase
      .from("visitas")
      .insert({
        lead_id: lead.id,
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

  try {
    const mapsUrl =
      proyectoUbicacionMapsUrl ??
      (proyectoUbicacion
        ? `https://maps.google.com/maps?q=${encodeURIComponent(proyectoUbicacion)}`
        : undefined);

    await sendEmail(
      data.email,
      `Confirmación de tu visita — ${data.fecha} ${data.horario}`,
      `<h2>¡Tu visita quedó confirmada!</h2>
       <p>Hola ${data.nombre}, te confirmamos la visita${proyectoNombre ? ` a <b>${proyectoNombre}</b>` : ""}:</p>
       <ul>
         <li><b>Fecha:</b> ${data.fecha}</li>
         <li><b>Horario:</b> ${data.horario}</li>
       </ul>
       ${
         mapsUrl
           ? `<div style="margin: 12px 0; padding: 10px 14px; border: 2px solid #16a34a; border-radius: 8px; background: #f0fdf4; display: inline-block;">
                <b>Ubicación:</b> <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #16a34a; font-weight: 600;">${mapsUrl}</a>
              </div>`
           : ""
       }
       <p>Al llegar, preguntá por <b>Matías De Nunzio</b>.</p>
       <p>Cualquier consulta antes de la visita, escribinos por WhatsApp al <a href="https://wa.me/5491127424512">11-2742-4512</a> o comunicate a la oficina.</p>
       <p>¡Te esperamos!</p>
       ${NOTA_COORDINACION_VISITA_HTML}
       ${NOTA_RESERVA_LOTE_HTML}`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de confirmación al cliente", err);
  }

  return NextResponse.json({ ok: true });
}
