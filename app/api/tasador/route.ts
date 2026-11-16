import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { origenDesdeRequest } from "@/lib/leads";
import { guardarLeadYContacto } from "@/lib/leads-servidor";
import {
  calcularTasacion,
  caracteristicas,
  descripcionInmueble,
  faltanteTasador,
  tasadorSchema,
  usd,
  valoresDesdeFilas,
} from "@/lib/tasador";

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

/** Tasador online: calcula el rango estimado, guarda el pedido y lo suma al CRM. */
export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "tasador", 6, 600);
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  // Campo trampa para bots: un humano no lo ve ni lo completa.
  if (String(body.empresa ?? "").trim()) return NextResponse.json({ ok: true });

  const parsed = tasadorSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Revisá los datos del formulario." }, { status: 400 });
  }
  const { nombre, telefono, email: emailCrudo, ...datos } = parsed.data;
  const email = emailCrudo && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCrudo) ? emailCrudo.toLowerCase() : null;
  if (emailCrudo && !email) return NextResponse.json({ error: "El mail no parece válido." }, { status: 400 });
  const faltante = faltanteTasador(datos);
  if (faltante) return NextResponse.json({ error: faltante }, { status: 400 });

  const supabase = await getSupabaseAdminClient();

  // Valores por zona: los del panel si existen; si no, los iniciales del código.
  let filas: unknown[] | null = null;
  if (supabase) {
    const { data } = await supabase.from("tasador_valores").select("*");
    filas = data ?? null;
  }
  const resultado = calcularTasacion(datos, valoresDesdeFilas(filas)[datos.partido]);
  const inmueble = descripcionInmueble({ tipo: datos.tipo, partido: datos.partido, localidad: datos.localidad ?? null, direccion: datos.direccion ?? null });
  const rango = `${usd(resultado.minimo)} a ${usd(resultado.maximo)} (central ${usd(resultado.central)})`;

  if (supabase) {
    const resumen = `🏷️ TASADOR ONLINE: ${inmueble}. Estimación: ${rango}.`;
    const lead = await guardarLeadYContacto(
      supabase,
      { tipo: "contacto", nombre, email: email ?? "", telefono, mensaje: "", observaciones: resumen, estado: "nuevo" },
      origenDesdeRequest(request)
    );
    const { error } = await supabase.from("tasaciones").insert({
      nombre,
      telefono,
      email,
      tipo: datos.tipo,
      partido: datos.partido,
      localidad: datos.localidad ?? null,
      direccion: datos.direccion ?? null,
      datos,
      resultado,
      lead_id: lead.id ?? null,
    });
    // Si todavía no se corrió sql-tasador.sql el pedido igual queda en el CRM y se avisa por mail.
    if (error) console.error("No se pudo guardar la tasación", error);
  }

  try {
    const detalle = caracteristicas({ tipo: datos.tipo, datos })
      .map((c) => `<li><b>${esc(c.etiqueta)}:</b> ${esc(c.valor)}</li>`)
      .join("");
    await sendNotificationEmail(
      `Tasador online: ${nombre} — ${inmueble}`,
      `<h2>Nuevo pedido del tasador online</h2>
       <p><b>${esc(inmueble)}</b></p>
       <p>Estimación automática: <b>${esc(rango)}</b></p>
       <ul>
         <li><b>Nombre:</b> ${esc(nombre)}</li>
         <li><b>WhatsApp:</b> ${esc(telefono)}</li>
         ${email ? `<li><b>Email:</b> ${esc(email)}</li>` : ""}
         ${detalle}
       </ul>
       <p><a href="${SITE_URL}/admin/tasador">Ver en el panel → Tasador</a></p>`
    );
  } catch (err) {
    console.error("No se pudo enviar el aviso del tasador", err);
  }

  return NextResponse.json({
    ok: true,
    inmueble,
    minimo: resultado.minimo,
    central: resultado.central,
    maximo: resultado.maximo,
    unitario: resultado.unitario,
    unidad: resultado.unidad,
  });
}
