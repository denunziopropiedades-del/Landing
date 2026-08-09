import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";

export const runtime = "nodejs";

const SECRET = process.env.ZAPIER_WEBHOOK_SECRET;

// Alias aceptados por campo, para no depender de cómo Zapier nombre cada columna
// (el usuario arma el mapeo a mano en el paso "Webhooks by Zapier" del Zap).
const ALIAS: Record<string, string> = {
  lead_id: "lead_id",
  id: "lead_id",
  leadgen_id: "lead_id",
  nombre: "nombre",
  full_name: "nombre",
  nombre_completo: "nombre",
  name: "nombre",
  email: "email",
  correo: "email",
  telefono: "telefono",
  teléfono: "telefono",
  phone: "telefono",
  phone_number: "telefono",
  ciudad: "ciudad",
  city: "ciudad",
  campana: "campana",
  campaña: "campana",
  campaign_name: "campana",
  formulario: "formulario",
  form_name: "formulario",
  plataforma: "plataforma",
  platform: "plataforma",
};

function secretValido(request: Request): boolean {
  if (!SECRET) return false;
  const { searchParams } = new URL(request.url);
  const recibido = request.headers.get("x-zapier-secret") ?? searchParams.get("secret") ?? "";
  const a = Buffer.from(SECRET);
  const b = Buffer.from(recibido);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!secretValido(request)) {
    return NextResponse.json({ error: "Secreto inválido" }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const conocidos: Record<string, string> = {};
  const extra: string[] = [];

  for (const [clave, valorRaw] of Object.entries(payload)) {
    const valor = String(valorRaw ?? "").trim();
    if (!valor) continue;
    const claveNormalizada = ALIAS[clave.toLowerCase().trim()];
    if (claveNormalizada) {
      conocidos[claveNormalizada] = valor;
    } else {
      extra.push(`${clave}: ${valor}`);
    }
  }

  const nombre = conocidos.nombre || "Consulta de Meta Ads (vía Zapier)";
  const email = conocidos.email || "";
  const telefono = conocidos.telefono || "";
  const leadId = conocidos.lead_id;

  if (!email && !telefono) {
    return NextResponse.json({ error: "Falta email o teléfono en el lead" }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();

  if (leadId && supabase) {
    const { data: existente } = await supabase.from("leads").select("id").eq("external_id", leadId).maybeSingle();
    if (existente) return NextResponse.json({ ok: true, duplicado: true });
  }

  const detalles: string[] = [];
  if (conocidos.campana) detalles.push(`Campaña: ${conocidos.campana}`);
  if (conocidos.formulario) detalles.push(`Formulario: ${conocidos.formulario}`);
  if (conocidos.plataforma) detalles.push(`Plataforma: ${conocidos.plataforma}`);
  if (conocidos.ciudad) detalles.push(`Ciudad: ${conocidos.ciudad}`);
  detalles.push(...extra);

  if (supabase) {
    await supabase.from("leads").insert({
      tipo: "meta",
      external_id: leadId ?? null,
      nombre,
      email: email || "sin-email@matulotes.app",
      telefono: telefono || "-",
      estado: "nuevo",
      observaciones: ["Lead recibido desde Zapier (formulario de Meta Ads).", ...detalles].join("\n"),
    });
  }

  try {
    await sendNotificationEmail(
      `Nuevo lead de Meta Ads: ${nombre}`,
      `<h2>Nuevo lead desde Zapier (formulario de Meta Ads)</h2>
       <ul>
         <li><b>Nombre:</b> ${nombre}</li>
         <li><b>Email:</b> ${email || "—"}</li>
         <li><b>Teléfono:</b> ${telefono || "—"}</li>
       </ul>`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de notificación", err);
  }

  return NextResponse.json({ ok: true });
}
