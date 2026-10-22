import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { cancelarEventoVisita, crearEventoVisita } from "@/lib/google-calendar";
import { NOTA_COORDINACION_VISITA_HTML, sendEmail, sendNotificationEmail } from "@/lib/email";
import { bloqueReprogramarHtml, motivoHorarioNoDisponible, verificarTokenReprogramacion } from "@/lib/visitas";

const schema = z.object({
  token: z.string().min(10),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Elegí una fecha"),
  horario: z.string().min(1, "Elegí un horario"),
});

function hoyBuenosAires() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "visitas");
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Elegí una fecha y un horario." }, { status: 400 });
  }
  const { token, fecha, horario } = parsed.data;

  const visitaId = verificarTokenReprogramacion(token);
  if (!visitaId) {
    return NextResponse.json({ error: "El link de reprogramación no es válido." }, { status: 404 });
  }

  if (fecha < hoyBuenosAires()) {
    return NextResponse.json({ error: "Elegí una fecha a partir de hoy." }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Servicio no disponible." }, { status: 503 });
  }

  const { data: visita } = await supabase
    .from("visitas")
    .select("id, lead_id, nombre, email, telefono, fecha, horario, estado, google_event_id, proyectos(nombre, ubicacion, ubicacion_maps_url)")
    .eq("id", visitaId)
    .maybeSingle();

  if (!visita) {
    return NextResponse.json({ error: "No encontramos la visita." }, { status: 404 });
  }
  if (visita.estado === "cancelada" || visita.estado === "realizada") {
    return NextResponse.json(
      { error: "Esta visita ya no se puede reprogramar. Escribinos por WhatsApp y la coordinamos." },
      { status: 409 }
    );
  }
  if (visita.fecha === fecha && visita.horario === horario) {
    return NextResponse.json({ error: "Ese es el mismo día y horario que ya tenías." }, { status: 400 });
  }

  const motivo = await motivoHorarioNoDisponible(supabase, fecha, horario, visita.id);
  if (motivo) {
    return NextResponse.json({ error: motivo }, { status: 409 });
  }

  const { error } = await supabase.from("visitas").update({ fecha, horario }).eq("id", visita.id);
  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "Ese horario ya fue reservado por otra persona. Elegí otro horario." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const proyecto = visita.proyectos as unknown as {
    nombre: string;
    ubicacion: string | null;
    ubicacion_maps_url: string | null;
  } | null;

  // Mueve el evento de Google Calendar al nuevo día/horario.
  if (visita.google_event_id) await cancelarEventoVisita(visita.google_event_id);
  const googleEventId = await crearEventoVisita({
    nombre: visita.nombre,
    email: visita.email,
    telefono: visita.telefono,
    fecha,
    horario,
    proyectoNombre: proyecto?.nombre,
  });
  await supabase.from("visitas").update({ google_event_id: googleEventId }).eq("id", visita.id);

  if (visita.lead_id) {
    const { data: lead } = await supabase.from("leads").select("observaciones").eq("id", visita.lead_id).maybeSingle();
    const nota = `Visita reprogramada por el cliente: del ${visita.fecha} ${visita.horario} al ${fecha} ${horario}.`;
    await supabase
      .from("leads")
      .update({ observaciones: [lead?.observaciones, nota].filter(Boolean).join("\n") })
      .eq("id", visita.lead_id);
  }

  try {
    await sendNotificationEmail(
      `Visita reprogramada: ${visita.nombre} — ${fecha} ${horario}`,
      `<h2>Un cliente reprogramó su visita</h2>
       <ul>
         <li><b>Nombre:</b> ${visita.nombre}</li>
         <li><b>Teléfono:</b> ${visita.telefono}</li>
         <li><b>Email:</b> ${visita.email}</li>
         ${proyecto?.nombre ? `<li><b>Proyecto:</b> ${proyecto.nombre}</li>` : ""}
         <li><b>Antes:</b> ${visita.fecha} ${visita.horario}</li>
         <li><b>Ahora:</b> ${fecha} ${horario}</li>
       </ul>`
    );
  } catch (err) {
    console.error("No se pudo enviar el aviso de visita reprogramada", err);
  }

  try {
    const mapsUrl =
      proyecto?.ubicacion_maps_url ??
      (proyecto?.ubicacion ? `https://maps.google.com/maps?q=${encodeURIComponent(proyecto.ubicacion)}` : undefined);
    await sendEmail(
      visita.email,
      `Reprogramamos tu visita — ${fecha} ${horario}`,
      `<h2>¡Listo! Tu visita quedó reprogramada</h2>
       <p>Hola ${visita.nombre}, cambiamos tu visita${proyecto?.nombre ? ` a <b>${proyecto.nombre}</b>` : ""} al nuevo día y horario:</p>
       <ul>
         <li><b>Fecha:</b> ${fecha}</li>
         <li><b>Horario:</b> ${horario}</li>
       </ul>
       ${
         mapsUrl
           ? `<p><b>Ubicación:</b> <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer">${mapsUrl}</a></p>`
           : ""
       }
       <p>Al llegar, preguntá por <b>Matías De Nunzio</b>.</p>
       ${bloqueReprogramarHtml(visita.id)}
       ${NOTA_COORDINACION_VISITA_HTML}`
    );
  } catch (err) {
    console.error("No se pudo enviar el mail de reprogramación al cliente", err);
  }

  return NextResponse.json({ ok: true });
}
