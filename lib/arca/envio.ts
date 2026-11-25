import type { SupabaseClient } from "@supabase/supabase-js";
import { leerConfig } from "@/lib/arca/config";
import type { Factura } from "@/lib/arca/facturas";
import { generarFacturaPdf } from "@/lib/arca/pdf";
import { sendEmail } from "@/lib/email";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");

export const nombreArchivo = (f: Factura) =>
  `${f.tipoCbte === 13 ? "NC" : "Factura"}-C-${String(f.puntoVenta).padStart(5, "0")}-${String(f.numero ?? 0).padStart(8, "0")}.pdf`;

/** Link público (sin login) al PDF, para mandar por WhatsApp. */
export const linkPublico = (f: Factura) => `${SITE}/api/factura/${f.tokenPublico}`;

export function textoWhatsapp(f: Factura) {
  const que = f.tipoCbte === 13 ? "la nota de crédito" : "la factura";
  return `Hola ${f.receptorNombre.split(" ").slice(-1)[0] ?? ""}, te enviamos ${que} N° ${String(f.puntoVenta).padStart(5, "0")}-${String(f.numero ?? 0).padStart(8, "0")} de MATULOTES · De Nunzio Negocios Inmobiliarios: ${linkPublico(f)}`;
}

export async function enviarFacturaPorEmail(a: SupabaseClient, f: Factura): Promise<{ ok: boolean; error?: string }> {
  if (f.estado !== "autorizada") return { ok: false, error: "Solo se envían facturas autorizadas." };
  if (!f.receptorEmail) return { ok: false, error: "El cliente no tiene email cargado." };
  const config = await leerConfig(a);
  const pdf = await generarFacturaPdf(f, config);
  const que = f.tipoCbte === 13 ? "Nota de crédito" : "Factura";
  const res = await sendEmail(
    f.receptorEmail,
    `${que} C N° ${String(f.puntoVenta).padStart(5, "0")}-${String(f.numero).padStart(8, "0")} — MATULOTES`,
    `<p>Hola ${f.receptorNombre},</p><p>Te adjuntamos ${que.toLowerCase()} electrónica correspondiente a tu pago. También podés verla acá: <a href="${linkPublico(f)}">${linkPublico(f)}</a></p><p>Muchas gracias por confiar en nosotros.</p><p><strong>MATULOTES · De Nunzio Negocios Inmobiliarios</strong></p>`,
    [{ filename: nombreArchivo(f), content: pdf.toString("base64") }]
  );
  if ("skipped" in res && res.skipped) return { ok: false, error: "El envío de mails no está configurado (RESEND_API_KEY)." };
  await a.from("arca_facturas").update({ enviada_email_en: new Date().toISOString() }).eq("id", f.id);
  return { ok: true };
}
