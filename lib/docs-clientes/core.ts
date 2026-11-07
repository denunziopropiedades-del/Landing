import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export * from "@/lib/docs-clientes/compartido";
import { mapDoc, sitio, type DocEmitido } from "@/lib/docs-clientes/compartido";

/* ───────── Seguridad: tokens, hashes y códigos ───────── */

export const sha256 = (v: string | Buffer) => createHash("sha256").update(v).digest("hex");

/** Token de 256 bits para el link privado. Solo se guarda su hash. */
export function nuevoToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: sha256(token) };
}

export const tokenValidoFormato = (t: string) => /^[A-Za-z0-9_-]{40,60}$/.test(t);

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O/1/I para dictarlo por teléfono
/** Código público de verificación (va en el QR): no expone datos personales. */
export function nuevoCodigoVerificacion(): string {
  let s = "";
  for (let i = 0; i < 10; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

/** Código de un solo uso de 6 dígitos para aceptar/rechazar. */
export function nuevoOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}
export const hashOtp = (docId: string, codigo: string) => sha256(`${docId}:${codigo}:${process.env.CRON_SECRET ?? "otp"}`);
export function otpCoincide(docId: string, codigo: string, hash: string) {
  const a = Buffer.from(hashOtp(docId, codigo), "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ───────── Auditoría ───────── */

export async function registrarEvento(
  admin: SupabaseClient,
  documentoId: string,
  tipo: string,
  detalle: Record<string, unknown> = {},
  actor: string | null = null
) {
  await admin.from("doc_eventos").insert({ documento_id: documentoId, tipo, detalle, actor });
}

/** true si ya hay un evento de ese tipo (para no mandar notificaciones duplicadas). */
export async function yaOcurrio(admin: SupabaseClient, documentoId: string, tipo: string) {
  const { count } = await admin.from("doc_eventos").select("id", { count: "exact", head: true }).eq("documento_id", documentoId).eq("tipo", tipo);
  return (count ?? 0) > 0;
}

/* ───────── Links privados ───────── */

export async function crearLink(
  admin: SupabaseClient,
  documentoId: string,
  opciones: { canal: string; dias: number; actor: string | null }
): Promise<{ url: string; linkId: string; venceEn: string }> {
  const { token, hash } = nuevoToken();
  const dias = Math.min(Math.max(Math.round(opciones.dias || 30), 1), 365);
  const venceEn = new Date(Date.now() + dias * 86400000).toISOString();
  const { data, error } = await admin
    .from("doc_links")
    .insert({ documento_id: documentoId, token_hash: hash, canal: opciones.canal, vence_en: venceEn, creado_por_email: opciones.actor })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await registrarEvento(admin, documentoId, "link_generado", { canal: opciones.canal, dias, linkId: data.id }, opciones.actor);
  return { url: `${sitio()}/cliente/documentos/${token}`, linkId: data.id as string, venceEn };
}

export type AccesoLink =
  | { ok: true; doc: DocEmitido; linkId: string; venceEn: string }
  | { ok: false; motivo: "invalido" | "vencido" | "revocado" };

/** Valida un token del link privado (sin registrar el acceso). */
export async function resolverToken(admin: SupabaseClient, token: string): Promise<AccesoLink> {
  if (!tokenValidoFormato(token)) return { ok: false, motivo: "invalido" };
  const { data: link } = await admin
    .from("doc_links")
    .select("id, documento_id, vence_en, revocado_en, doc_emitidos(*)")
    .eq("token_hash", sha256(token))
    .maybeSingle();
  if (!link || !link.doc_emitidos) return { ok: false, motivo: "invalido" };
  if (link.revocado_en) return { ok: false, motivo: "revocado" };
  if (new Date(link.vence_en as string).getTime() < Date.now()) return { ok: false, motivo: "vencido" };
  return { ok: true, doc: mapDoc(link.doc_emitidos), linkId: link.id as string, venceEn: link.vence_en as string };
}

/** Registra un acceso (contador siempre; evento de auditoría como mucho una vez por hora por link). */
export async function registrarAcceso(admin: SupabaseClient, docId: string, linkId: string, que: "portal" | "pdf" | "descarga") {
  const { data: l } = await admin.from("doc_links").select("accesos, ultimo_acceso_en").eq("id", linkId).maybeSingle();
  const ultimo = l?.ultimo_acceso_en ? new Date(l.ultimo_acceso_en as string).getTime() : 0;
  await admin
    .from("doc_links")
    .update({ accesos: Number(l?.accesos ?? 0) + 1, ultimo_acceso_en: new Date().toISOString() })
    .eq("id", linkId);
  if (que !== "portal" || Date.now() - ultimo > 3600_000) await registrarEvento(admin, docId, `cliente_${que}`, { linkId }, "cliente");
}

/* ───────── PDF guardado ───────── */

export const BUCKET = "documentos-clientes";

export async function leerPdf(admin: SupabaseClient, doc: DocEmitido): Promise<Buffer | null> {
  if (!doc.pdfPath) return null;
  const { data, error } = await admin.storage.from(BUCKET).download(doc.pdfPath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

