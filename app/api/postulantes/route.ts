import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  CV_MAX_BYTES,
  CV_TIPOS,
  DISPONIBILIDADES,
  EXPERIENCIAS,
  PUESTOS,
  labelDe,
  postulanteSchema,
} from "@/lib/postulantes";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

/** Postulaciones de "Trabajá con nosotros" (/postulantes), con CV adjunto opcional. */
export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "postulantes", 4, 300);
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });

  // Campo trampa para bots: un humano no lo ve ni lo completa.
  if (String(form.get("empresa") ?? "").trim()) return NextResponse.json({ ok: true });

  const texto = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() ? v : undefined;
  };
  const parsed = postulanteSchema.safeParse({
    nombre: texto("nombre"),
    email: texto("email"),
    telefono: texto("telefono"),
    localidad: texto("localidad"),
    puesto: texto("puesto"),
    experiencia: texto("experiencia"),
    disponibilidad: texto("disponibilidad"),
    movilidad: form.get("movilidad") === "si",
    linkedin: texto("linkedin"),
    mensaje: texto("mensaje"),
  });
  if (!parsed.success) {
    const primero = parsed.error.issues[0]?.message;
    return NextResponse.json({ error: primero ?? "Revisá los datos del formulario." }, { status: 400 });
  }
  const data = parsed.data;

  const cv = form.get("cv");
  const archivo = cv instanceof File && cv.size > 0 ? cv : null;
  if (archivo) {
    if (archivo.size > CV_MAX_BYTES) {
      return NextResponse.json({ error: "El CV pesa más de 4 MB. Probá con un PDF más liviano." }, { status: 400 });
    }
    if (!CV_TIPOS[archivo.type]) {
      return NextResponse.json({ error: "El CV tiene que ser PDF o Word (.doc / .docx)." }, { status: 400 });
    }
  }

  const supabase = await getSupabaseAdminClient();
  let cvPath: string | null = null;

  if (supabase) {
    if (archivo) {
      const ext = CV_TIPOS[archivo.type];
      cvPath = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${ext}`;
      const { error: errSubida } = await supabase.storage
        .from("cvs")
        .upload(cvPath, Buffer.from(await archivo.arrayBuffer()), { contentType: archivo.type, upsert: false });
      if (errSubida) {
        console.error("No se pudo subir el CV", errSubida);
        cvPath = null; // la postulación igual se guarda, sin CV
      }
    }

    const { error } = await supabase.from("postulantes").insert({
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      localidad: data.localidad,
      puesto: data.puesto,
      experiencia: data.experiencia,
      disponibilidad: data.disponibilidad,
      movilidad: data.movilidad,
      linkedin: data.linkedin ?? null,
      mensaje: data.mensaje ?? null,
      cv_path: cvPath,
      cv_nombre: cvPath && archivo ? archivo.name.slice(0, 200) : null,
    });
    if (error) {
      console.error("No se pudo guardar la postulación", error);
      return NextResponse.json({ error: "No pudimos guardar tu postulación. Probá de nuevo." }, { status: 500 });
    }
  }

  const puesto = labelDe(PUESTOS, data.puesto);
  try {
    await sendNotificationEmail(
      `Nueva postulación: ${data.nombre} — ${puesto}`,
      `<h2>Nueva postulación — ${esc(puesto)}</h2>
       <ul>
         <li><b>Nombre:</b> ${esc(data.nombre)}</li>
         <li><b>WhatsApp:</b> ${esc(data.telefono)}</li>
         <li><b>Email:</b> ${esc(data.email)}</li>
         <li><b>Localidad:</b> ${esc(data.localidad)}</li>
         <li><b>Experiencia:</b> ${esc(labelDe(EXPERIENCIAS, data.experiencia))}</li>
         <li><b>Disponibilidad:</b> ${esc(labelDe(DISPONIBILIDADES, data.disponibilidad))}</li>
         <li><b>Movilidad propia:</b> ${data.movilidad ? "Sí" : "No"}</li>
         ${data.linkedin ? `<li><b>LinkedIn:</b> ${esc(data.linkedin)}</li>` : ""}
         <li><b>CV:</b> ${cvPath ? "adjuntado (descargalo desde el panel)" : "no adjuntó"}</li>
       </ul>
       ${data.mensaje ? `<p><b>Mensaje:</b> ${esc(data.mensaje)}</p>` : ""}
       <p><a href="${SITE_URL}/admin/postulantes">Ver en el panel → Postulantes</a></p>`
    );
  } catch (err) {
    console.error("No se pudo enviar el aviso de postulación", err);
  }

  return NextResponse.json({ ok: true });
}
