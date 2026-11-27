import { NextResponse } from "next/server";
import { guardarLeadYContacto } from "@/lib/leads-servidor";
import { enviarEtapaCrm } from "@/lib/meta-capi";
import crypto from "node:crypto";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { nombreInstagram, nombreMessenger, registrarMensaje } from "@/lib/mensajeria";

export const runtime = "nodejs";

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.META_APP_SECRET;
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN;
const GRAPH_VERSION = "v21.0";

/**
 * Verificación del webhook: Meta hace este GET una sola vez al configurar la
 * suscripción, para confirmar que somos dueños del endpoint.
 * https://developers.facebook.com/docs/graph-api/webhooks/getting-started
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const modo = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (modo === "subscribe" && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function firmaValida(cuerpoCrudo: string, firmaHeader: string | null): boolean {
  if (!APP_SECRET || !firmaHeader) return false;
  const esperada = `sha256=${crypto.createHmac("sha256", APP_SECRET).update(cuerpoCrudo).digest("hex")}`;
  const a = Buffer.from(esperada);
  const b = Buffer.from(firmaHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

type EventoMessenger = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    app_id?: number;
    attachments?: { type?: string; payload?: { url?: string } }[];
  };
};

/**
 * Un mensaje de Messenger: si lo escribió el cliente, entra a la bandeja; si es un
 * "eco" (la página respondió desde Meta Business Suite o desde el panel), se guarda
 * como respuesta para que la conversación quede completa.
 */
async function procesarMessenger(
  supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseAdminClient>>>,
  pageId: string,
  ev: EventoMessenger,
  red: "messenger" | "instagram" = "messenger"
) {
  const m = ev.message;
  if (!m || !pageId) return;
  const eco = !!m.is_echo;
  const psid = eco ? ev.recipient?.id : ev.sender?.id;
  if (!psid) return;
  const adjunto = m.attachments?.[0];
  const tipoAdj = adjunto?.type === "file" ? "document" : adjunto?.type;
  await registrarMensaje(supabase, {
    canal: { tipo: red, externalId: pageId },
    contactoId: psid,
    nombre: eco ? null : red === "instagram" ? await nombreInstagram(psid) : await nombreMessenger(psid),
    direccion: eco ? "saliente" : "entrante",
    tipo: m.text ? "text" : tipoAdj || "otro",
    texto: m.text ?? "",
    mediaUrl: adjunto?.payload?.url ?? null,
    externalId: m.mid ?? null,
    fecha: ev.timestamp ? new Date(ev.timestamp) : undefined,
    enviadoDesde: "celular",
  });
}

type CampoLead = { name: string; values?: string[] };

function extraerCampo(campos: CampoLead[], ...nombres: string[]): string | undefined {
  for (const nombre of nombres) {
    const campo = campos.find((c) => c.name?.toLowerCase() === nombre);
    if (campo?.values?.[0]) return campo.values[0];
  }
  return undefined;
}

/** Notificación en tiempo real de un nuevo lead generado en un formulario de Meta Ads. */
export async function POST(request: Request) {
  const cuerpoCrudo = await request.text();

  if (!firmaValida(cuerpoCrudo, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let payload: {
    object?: string;
    entry?: {
      id?: string;
      changes?: { field?: string; value?: { leadgen_id?: string } }[];
      messaging?: EventoMessenger[];
    }[];
  };
  try {
    payload = JSON.parse(cuerpoCrudo);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const supabase = await getSupabaseAdminClient();

  // Mensajes de Messenger de la página → bandeja de /admin/mensajes.
  if (supabase) {
    for (const entry of payload.entry ?? []) {
      for (const ev of entry.messaging ?? []) {
        try {
          await procesarMessenger(supabase, entry.id ?? ev.recipient?.id ?? "", ev, payload.object === "instagram" ? "instagram" : "messenger");
        } catch (err) {
          console.error("Webhook Messenger: error procesando el mensaje", err);
        }
      }
    }
  }

  const leadgenIds = (payload.entry ?? [])
    .flatMap((entry) => entry.changes ?? [])
    .filter((c) => c.field === "leadgen" && c.value?.leadgen_id)
    .map((c) => c.value!.leadgen_id!);

  for (const leadgenId of leadgenIds) {
    try {
      if (supabase) {
        const { data: existente } = await supabase
          .from("leads")
          .select("id")
          .eq("external_id", leadgenId)
          .maybeSingle();
        if (existente) continue; // ya lo procesamos (Meta puede reenviar el mismo evento)
      }

      if (!PAGE_ACCESS_TOKEN) continue;

      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${leadgenId}?fields=field_data&access_token=${PAGE_ACCESS_TOKEN}`
      );
      if (!res.ok) {
        console.error("Error consultando lead de Meta", await res.text());
        continue;
      }

      const detalle = (await res.json()) as { field_data?: CampoLead[] };
      const campos = detalle.field_data ?? [];

      const nombre = extraerCampo(campos, "full_name", "nombre_completo", "name") ?? "Consulta de Meta Ads";
      const email = extraerCampo(campos, "email", "correo_electrónico") ?? "";
      const telefono = extraerCampo(campos, "phone_number", "teléfono", "telefono") ?? "";

      if (supabase) {
        await guardarLeadYContacto(supabase, {
          tipo: "meta",
          origen: "meta_lead_ads",
          external_id: leadgenId,
          nombre,
          email,
          telefono,
          estado: "nuevo",
          observaciones: "Lead generado desde un formulario de Meta Ads (Facebook/Instagram).",
        });
        await enviarEtapaCrm({ estado: "nuevo", metaLeadId: leadgenId, email, telefono, nombre });
      }

      try {
        await sendNotificationEmail(
          `Nuevo lead de Meta Ads: ${nombre}`,
          `<h2>Nuevo lead desde un formulario de Meta Ads</h2>
           <ul>
             <li><b>Nombre:</b> ${nombre}</li>
             <li><b>Email:</b> ${email || "—"}</li>
             <li><b>Teléfono:</b> ${telefono || "—"}</li>
           </ul>`
        );
      } catch (err) {
        console.error("No se pudo enviar el email de notificación", err);
      }
    } catch (err) {
      console.error("Error procesando lead de Meta", err);
    }
  }

  return NextResponse.json({ ok: true });
}
