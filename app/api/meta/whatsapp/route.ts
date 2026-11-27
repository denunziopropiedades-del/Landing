import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { actualizarEstado, registrarMensaje, type Entrante } from "@/lib/mensajeria";

export const runtime = "nodejs";

/**
 * Webhook de WhatsApp Cloud API (objeto "whatsapp_business_account").
 * Recibe los mensajes de los clientes, los estados de lo que enviamos y —con
 * coexistencia— los "ecos" de lo que respondés desde la app WhatsApp Business del celular.
 *
 * En Meta for Developers → tu app → WhatsApp → Configuración:
 *   URL de devolución de llamada: https://matulotes.app/api/meta/whatsapp
 *   Token de verificación: el mismo valor de META_WEBHOOK_VERIFY_TOKEN
 *   Campos: messages, smb_message_echoes
 */

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("hub.mode") === "subscribe" && VERIFY_TOKEN && searchParams.get("hub.verify_token") === VERIFY_TOKEN) {
    return new NextResponse(searchParams.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function firmaValida(cuerpo: string, firma: string | null): boolean {
  if (!APP_SECRET || !firma) return false;
  const esperada = `sha256=${crypto.createHmac("sha256", APP_SECRET).update(cuerpo).digest("hex")}`;
  const a = Buffer.from(esperada);
  const b = Buffer.from(firma);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

type MensajeWa = {
  id: string;
  from?: string;
  to?: string;
  timestamp?: string;
  type: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string };
  video?: { id?: string; caption?: string };
  document?: { id?: string; caption?: string; filename?: string };
  audio?: { id?: string };
  sticker?: { id?: string };
  location?: { latitude?: number; longitude?: number; name?: string; address?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
  reaction?: { emoji?: string };
};

type ValorWa = {
  metadata?: { phone_number_id?: string; display_phone_number?: string };
  contacts?: { wa_id?: string; profile?: { name?: string } }[];
  messages?: MensajeWa[];
  message_echoes?: MensajeWa[];
  statuses?: { id: string; status: string; errors?: { title?: string; message?: string }[] }[];
};

function contenido(m: MensajeWa): { tipo: string; texto: string; mediaId: string | null } {
  switch (m.type) {
    case "text":
      return { tipo: "text", texto: m.text?.body ?? "", mediaId: null };
    case "image":
    case "video":
    case "sticker":
    case "audio":
      return { tipo: m.type, texto: (m[m.type] as { caption?: string } | undefined)?.caption ?? "", mediaId: (m[m.type] as { id?: string } | undefined)?.id ?? null };
    case "document":
      return { tipo: "document", texto: m.document?.caption || m.document?.filename || "", mediaId: m.document?.id ?? null };
    case "location": {
      const l = m.location ?? {};
      const link = l.latitude != null ? ` https://maps.google.com/?q=${l.latitude},${l.longitude}` : "";
      return { tipo: "location", texto: `📍 ${[l.name, l.address].filter(Boolean).join(" – ")}${link}`.trim(), mediaId: null };
    }
    case "button":
      return { tipo: "text", texto: m.button?.text ?? "", mediaId: null };
    case "interactive":
      return { tipo: "text", texto: m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "", mediaId: null };
    case "reaction":
      return { tipo: "text", texto: `Reaccionó ${m.reaction?.emoji ?? ""}`.trim(), mediaId: null };
    default:
      return { tipo: "otro", texto: "Mensaje que el panel no puede mostrar (abrilo en el celular).", mediaId: null };
  }
}

export async function POST(request: Request) {
  const cuerpo = await request.text();
  if (!firmaValida(cuerpo, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let payload: { object?: string; entry?: { changes?: { field?: string; value?: ValorWa }[] }[] };
  try {
    payload = JSON.parse(cuerpo);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: true });

  for (const entry of payload.entry ?? []) {
    for (const cambio of entry.changes ?? []) {
      const v = cambio.value;
      const phoneId = v?.metadata?.phone_number_id;
      if (!v || !phoneId) continue;
      const canal = { tipo: "whatsapp" as const, externalId: phoneId, numero: v.metadata?.display_phone_number?.replace(/\D/g, "") ?? null };

      try {
        if (cambio.field === "messages") {
          for (const m of v.messages ?? []) {
            const contacto = v.contacts?.find((c) => c.wa_id === m.from) ?? v.contacts?.[0];
            const c = contenido(m);
            const e: Entrante = {
              canal,
              contactoId: m.from ?? contacto?.wa_id ?? "",
              nombre: contacto?.profile?.name ?? null,
              telefono: m.from ?? null,
              direccion: "entrante",
              tipo: c.tipo,
              texto: c.texto,
              mediaId: c.mediaId,
              externalId: m.id,
              fecha: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
            };
            if (e.contactoId) await registrarMensaje(supabase, e);
          }
          for (const s of v.statuses ?? []) {
            const err = s.errors?.[0];
            await actualizarEstado(supabase, s.id, s.status, err ? err.message || err.title : null);
          }
        }

        // Coexistencia: lo que respondés desde la app WhatsApp Business del celular.
        if (cambio.field === "smb_message_echoes") {
          for (const m of v.message_echoes ?? []) {
            const c = contenido(m);
            if (!m.to) continue;
            await registrarMensaje(supabase, {
              canal,
              contactoId: m.to,
              telefono: m.to,
              direccion: "saliente",
              tipo: c.tipo,
              texto: c.texto,
              mediaId: c.mediaId,
              externalId: m.id,
              fecha: m.timestamp ? new Date(Number(m.timestamp) * 1000) : undefined,
              enviadoDesde: "celular",
            });
          }
        }
      } catch (err) {
        console.error("Webhook WhatsApp: error procesando el cambio", err);
      }
    }
  }

  // Siempre 200: si no, Meta reintenta y termina desactivando el webhook.
  return NextResponse.json({ ok: true });
}
