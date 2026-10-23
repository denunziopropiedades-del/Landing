import { NextResponse } from "next/server";
import { visitaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { NOTA_COORDINACION_VISITA_HTML, NOTA_RESERVA_LOTE_HTML, sendEmail, sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { crearEventoVisita } from "@/lib/google-calendar";
import { bloqueReprogramarHtml, linkReprogramacion, motivoHorarioNoDisponible } from "@/lib/visitas";
import { formatearPrecio, labelTipo, mapPropiedad, ubicacionTexto } from "@/lib/propiedades-base";

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
    const motivo = await motivoHorarioNoDisponible(supabase, data.fecha, data.horario);
    if (motivo) {
      return NextResponse.json({ error: motivo }, { status: 409 });
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

    // Visita a una propiedad publicada (desde su ficha): se usa su título y ubicación.
    let propiedadTexto: string | null = null;
    if (data.propiedadId) {
      const { data: prop } = await supabase.from("propiedades").select("*").eq("id", data.propiedadId).maybeSingle();
      if (prop) {
        const pr = mapPropiedad(prop);
        proyectoNombre = pr.titulo;
        proyectoUbicacion = [pr.direccion && !/^https?:\/\//i.test(pr.direccion) ? pr.direccion : null, ubicacionTexto(pr)].filter(Boolean).join(", ");
        proyectoUbicacionMapsUrl = pr.mapsUrl ?? (pr.direccion && /^https?:\/\//i.test(pr.direccion) ? pr.direccion : undefined);
        propiedadTexto = `${pr.titulo} (${labelTipo(pr.tipo)} en ${pr.operacion}, ${ubicacionTexto(pr)}, ${formatearPrecio(pr)})`;
      }
    }

    const filaLead: Record<string, unknown> = {
      tipo: "visita",
      proyecto_id: data.proyectoId || null,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      observaciones: [
        `Visita agendada para el ${data.fecha} a las ${data.horario}.`,
        propiedadTexto ? `🏠 Propiedad: ${propiedadTexto}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
      estado: "visita_programada",
    };
    let { data: lead, error: errorLead } = await supabase
      .from("leads")
      .insert(data.propiedadId && propiedadTexto ? { ...filaLead, propiedad_id: data.propiedadId } : filaLead)
      .select("id")
      .single();
    // Si todavía no existe la columna propiedad_id, se guarda igual (el dato queda en observaciones).
    if (errorLead && data.propiedadId) ({ data: lead, error: errorLead } = await supabase.from("leads").insert(filaLead).select("id").single());
    if (errorLead || !lead) {
      return NextResponse.json({ error: errorLead?.message ?? "No se pudo registrar la visita." }, { status: 500 });
    }

    const filaVisita: Record<string, unknown> = {
      lead_id: lead.id,
      proyecto_id: data.proyectoId || null,
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      fecha: data.fecha,
      horario: data.horario,
      estado: "pendiente",
    };
    let { data: visita, error } = await supabase
      .from("visitas")
      .insert(data.propiedadId && propiedadTexto ? { ...filaVisita, propiedad_id: data.propiedadId } : filaVisita)
      .select("id")
      .single();
    if (error && error.code !== "23505" && data.propiedadId)
      ({ data: visita, error } = await supabase.from("visitas").insert(filaVisita).select("id").single());

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Ese horario ya fue reservado por otra persona. Elegí otro horario." },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    visitaId = visita?.id ?? null;
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
         ${proyectoNombre ? `<li><b>${data.propiedadId ? "Propiedad" : "Proyecto"}:</b> ${proyectoNombre}${proyectoUbicacion ? ` — ${proyectoUbicacion}` : ""}</li>` : ""}
         <li><b>Nombre:</b> ${data.nombre}</li>
         <li><b>Email:</b> ${data.email || "—"}</li>
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

    if (data.email) await sendEmail(
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
       ${visitaId ? bloqueReprogramarHtml(visitaId) : ""}
       ${NOTA_COORDINACION_VISITA_HTML}
       ${NOTA_RESERVA_LOTE_HTML}`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de confirmación al cliente", err);
  }

  return NextResponse.json({ ok: true, reprogramarUrl: visitaId ? linkReprogramacion(visitaId) : null });
}
