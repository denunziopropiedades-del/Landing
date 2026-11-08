import type { SupabaseClient } from "@supabase/supabase-js";
import { NOTA_COORDINACION_VISITA_HTML, NOTA_RESERVA_LOTE_HTML, sendEmail } from "@/lib/email";
import { bloqueReprogramarHtml } from "@/lib/visitas";
import { mapPropiedad, ubicacionTexto } from "@/lib/propiedades-base";

/** Mail de confirmación de visita al cliente, con lugar y ubicación (Google Maps). */
export function armarMailConfirmacionVisita(d: {
  visitaId: string | null;
  nombre: string;
  fecha: string;
  horario: string;
  lugar?: string | null;
  ubicacion?: string | null;
  mapsUrl?: string | null;
  recordatorio?: boolean;
}) {
  const mapsUrl = d.mapsUrl ?? (d.ubicacion ? `https://maps.google.com/maps?q=${encodeURIComponent(d.ubicacion)}` : undefined);
  const asunto = `${d.recordatorio ? "Ubicación de tu visita" : "Confirmación de tu visita"} — ${d.fecha} ${d.horario}`;
  const html = `<h2>${d.recordatorio ? "Te reenviamos los datos de tu visita" : "¡Tu visita quedó confirmada!"}</h2>
       <p>Hola ${d.nombre}, te ${d.recordatorio ? "recordamos" : "confirmamos"} la visita${d.lugar ? ` a <b>${d.lugar}</b>` : ""}:</p>
       <ul>
         <li><b>Fecha:</b> ${d.fecha}</li>
         <li><b>Horario:</b> ${d.horario}</li>
         ${d.ubicacion && !/^https?:\/\//i.test(d.ubicacion) ? `<li><b>Dirección:</b> ${d.ubicacion}</li>` : ""}
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
       ${d.visitaId ? bloqueReprogramarHtml(d.visitaId) : ""}
       ${NOTA_COORDINACION_VISITA_HTML}
       ${NOTA_RESERVA_LOTE_HTML}`;
  return { asunto, html };
}

/** Reenvía al cliente el mail de su visita con la ubicación. Devuelve el mail al que se mandó. */
export async function reenviarMailVisita(a: SupabaseClient, visitaId: string): Promise<{ ok: true; a: string } | { ok: false; error: string }> {
  const { data: v } = await a
    .from("visitas")
    .select("id, nombre, email, fecha, horario, estado, propiedad_id, proyectos(nombre, ubicacion, ubicacion_maps_url)")
    .eq("id", visitaId)
    .maybeSingle();
  if (!v) return { ok: false, error: "No se encontró la visita." };
  if (!v.email) return { ok: false, error: "La visita no tiene mail del cliente: mandale la ubicación por WhatsApp." };
  if (v.estado === "cancelada") return { ok: false, error: "La visita está cancelada." };

  let lugar: string | null = null;
  let ubicacion: string | null = null;
  let mapsUrl: string | null = null;
  if (v.propiedad_id) {
    const { data: prop } = await a.from("propiedades").select("*").eq("id", v.propiedad_id).maybeSingle();
    if (prop) {
      const pr = mapPropiedad(prop);
      lugar = pr.titulo;
      ubicacion = [pr.direccion && !/^https?:\/\//i.test(pr.direccion) ? pr.direccion : null, ubicacionTexto(pr)].filter(Boolean).join(", ") || null;
      mapsUrl = pr.mapsUrl ?? (pr.direccion && /^https?:\/\//i.test(pr.direccion) ? pr.direccion : null);
    }
  }
  const p = v.proyectos as unknown as { nombre: string; ubicacion: string | null; ubicacion_maps_url: string | null } | null;
  if (!lugar && p) {
    lugar = p.nombre;
    ubicacion = p.ubicacion;
    mapsUrl = p.ubicacion_maps_url;
  }
  const m = armarMailConfirmacionVisita({
    visitaId: v.id as string,
    nombre: v.nombre as string,
    fecha: v.fecha as string,
    horario: v.horario as string,
    lugar,
    ubicacion,
    mapsUrl,
    recordatorio: true,
  });
  await sendEmail(v.email as string, m.asunto, m.html);
  return { ok: true, a: v.email as string };
}
