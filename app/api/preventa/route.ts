import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { guardarLeadUnificado, labelOrigen, origenDesdeRequest } from "@/lib/leads";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

const schema = z.object({
  nombre: z.string().trim().min(1).max(80),
  apellido: z.string().trim().min(1).max(80),
  anticipo: z.string().trim().min(1).max(10),
  whatsapp: z.string().trim().min(8).max(40),
  email: z.string().trim().email().max(120),
  localidad: z.string().trim().max(80).optional(),
  lotes: z.string().trim().max(40).optional(),
  pago: z.string().trim().max(40).optional(),
  comentarios: z.string().trim().max(1000).optional(),
  preventa: z.string().trim().max(120).optional(),
  pagina: z.string().trim().max(500).optional(),
  utm_source: z.string().trim().max(120).optional(),
  utm_medium: z.string().trim().max(120).optional(),
  utm_campaign: z.string().trim().max(120).optional(),
  website: z.string().max(200).optional(),
});

/** Inscripciones a la preventa: quedan como lead en el CRM (origen "preventa"). */
export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "preventa", 6, 300);
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  const crudo = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string>;
  const parsed = schema.safeParse(crudo);
  if (!parsed.success) return NextResponse.json({ error: "Faltan datos obligatorios." }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ ok: true }); // campo trampa para bots

  const supabase = await getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ error: "La base de datos no está disponible." }, { status: 503 });

  const origen = origenDesdeRequest(request, {
    utm_source: d.utm_source ?? null,
    utm_medium: d.utm_medium ?? null,
    utm_campaign: d.utm_campaign ?? null,
  });
  const preventa = d.preventa ?? "Preventa";
  const anticipoSi = /^s/i.test(d.anticipo);
  const pagoCuotas = /cuota/i.test(d.pago ?? "");

  const res = await guardarLeadUnificado(
    supabase,
    {
      tipo: "contacto",
      origen: "preventa",
      nombre: d.nombre,
      apellido: d.apellido,
      email: d.email,
      telefono: d.whatsapp,
      mensaje: d.comentarios ?? "",
      estado: "nuevo",
      busqueda_anticipo: anticipoSi ? "si" : "no",
      busqueda_pago: d.pago ? (pagoCuotas ? "cuotas" : "contado") : null,
      busqueda_zona: d.localidad ?? null,
      busqueda_notas: [preventa, d.lotes].filter(Boolean).join(" · "),
      observaciones: [
        `📝 Inscripción a la ${preventa}.`,
        `Anticipo: ${anticipoSi ? "Sí" : "No"} · ${d.lotes ?? "1 lote"} · ${d.pago ?? "—"}`,
        d.localidad ? `Localidad: ${d.localidad}` : null,
        d.comentarios ? `Comentarios: ${d.comentarios}` : null,
        origen.origen && origen.origen !== "directo" ? `Llegó desde: ${labelOrigen(origen.origen)}` : null,
        origen.utm_campaign ? `Campaña: ${origen.utm_campaign}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    },
    { ...origen, origen: "preventa" }
  );
  if (res.error) return NextResponse.json({ error: res.error }, { status: 500 });

  try {
    await sendNotificationEmail(
      `Nueva inscripción a la preventa: ${d.nombre} ${d.apellido}`,
      `<h2>Nueva inscripción — ${esc(preventa)}</h2>
       <ul>
         <li><b>Nombre:</b> ${esc(d.nombre)} ${esc(d.apellido)}</li>
         <li><b>WhatsApp:</b> ${esc(d.whatsapp)}</li>
         <li><b>Email:</b> ${esc(d.email)}</li>
         <li><b>Anticipo:</b> ${anticipoSi ? "Sí" : "No"}</li>
         <li><b>Lotes:</b> ${esc(d.lotes ?? "—")} · <b>Pago:</b> ${esc(d.pago ?? "—")}</li>
         ${d.comentarios ? `<li><b>Comentarios:</b> ${esc(d.comentarios)}</li>` : ""}
       </ul>
       ${res.unificado ? "<p>Esta persona ya había consultado: se sumó a su ficha en el CRM.</p>" : ""}`
    );
  } catch (err) {
    console.error("No se pudo enviar el aviso de preventa", err);
  }

  return NextResponse.json({ ok: true, unificado: res.unificado });
}
