import type { SupabaseClient } from "@supabase/supabase-js";
import { GRAPH } from "@/lib/mensajeria";

/**
 * Comentarios de la página de Facebook (webhook "feed") y de Instagram (webhook "comments").
 * Se guardan para responderlos desde el panel, en público o por privado.
 */

const TOKEN_PAGINA = () => process.env.META_PAGE_ACCESS_TOKEN;

export type ComentarioFb = {
  item?: string;
  verb?: string;
  comment_id?: string;
  post_id?: string;
  parent_id?: string;
  message?: string;
  from?: { id?: string; name?: string };
  post?: { permalink_url?: string };
  created_time?: number;
};

export type ComentarioIg = {
  id?: string;
  text?: string;
  from?: { id?: string; username?: string };
  media?: { id?: string };
  parent_id?: string;
};

async function datosPublicacion(red: "facebook" | "instagram", postId: string): Promise<{ link: string | null; texto: string | null }> {
  const token = TOKEN_PAGINA();
  if (!token || !postId) return { link: null, texto: null };
  try {
    const campos = red === "instagram" ? "permalink,caption" : "permalink_url,message";
    const res = await fetch(`${GRAPH}/${postId}?fields=${campos}&access_token=${encodeURIComponent(token)}`);
    const j = (await res.json()) as { permalink?: string; permalink_url?: string; caption?: string; message?: string };
    return { link: j.permalink ?? j.permalink_url ?? null, texto: (j.caption ?? j.message ?? "").slice(0, 300) || null };
  } catch {
    return { link: null, texto: null };
  }
}

/** Comentario nuevo en la página de Facebook. Los de la propia página marcan el original como atendido. */
export async function registrarComentarioFacebook(supabase: SupabaseClient, pageId: string, v: ComentarioFb) {
  if (v.item !== "comment" || !v.comment_id) return;
  if (v.verb === "remove") {
    await supabase.from("comentarios").delete().eq("comentario_id", v.comment_id);
    return;
  }
  if (v.verb !== "add") return;
  if (v.from?.id === pageId) {
    if (v.parent_id) await supabase.from("comentarios").update({ atendido: true }).eq("comentario_id", v.parent_id);
    return;
  }
  const post = await datosPublicacion("facebook", v.post_id ?? "");
  await supabase.from("comentarios").upsert(
    {
      red: "facebook",
      cuenta_id: pageId,
      comentario_id: v.comment_id,
      post_id: v.post_id ?? null,
      padre_id: v.parent_id && v.parent_id !== v.post_id ? v.parent_id : null,
      post_link: v.post?.permalink_url ?? post.link,
      post_texto: post.texto,
      autor_id: v.from?.id ?? null,
      autor_nombre: v.from?.name ?? null,
      texto: v.message ?? "",
      creado_en: v.created_time ? new Date(v.created_time * 1000).toISOString() : new Date().toISOString(),
    },
    { onConflict: "comentario_id", ignoreDuplicates: true }
  );
}

/** Comentario nuevo en una publicación de Instagram. */
export async function registrarComentarioInstagram(supabase: SupabaseClient, igId: string, v: ComentarioIg) {
  if (!v.id) return;
  if (v.from?.id === igId) {
    if (v.parent_id) await supabase.from("comentarios").update({ atendido: true }).eq("comentario_id", v.parent_id);
    return;
  }
  const post = await datosPublicacion("instagram", v.media?.id ?? "");
  await supabase.from("comentarios").upsert(
    {
      red: "instagram",
      cuenta_id: igId,
      comentario_id: v.id,
      post_id: v.media?.id ?? null,
      padre_id: v.parent_id ?? null,
      post_link: post.link,
      post_texto: post.texto,
      autor_id: v.from?.id ?? null,
      autor_nombre: v.from?.username ? `@${v.from.username}` : null,
      texto: v.text ?? "",
    },
    { onConflict: "comentario_id", ignoreDuplicates: true }
  );
}

/** Responde un comentario en público (debajo del comentario). */
export async function responderEnPublico(red: "facebook" | "instagram", comentarioId: string, texto: string) {
  const token = TOKEN_PAGINA();
  if (!token) return { ok: false as const, error: "Falta META_PAGE_ACCESS_TOKEN en Vercel." };
  const ruta = red === "instagram" ? `${comentarioId}/replies` : `${comentarioId}/comments`;
  const res = await fetch(`${GRAPH}/${ruta}?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: texto }),
  });
  const j = (await res.json().catch(() => ({}))) as { id?: string; error?: { message?: string; error_user_msg?: string } };
  if (!res.ok) return { ok: false as const, error: j.error?.error_user_msg || j.error?.message || "Meta rechazó la respuesta." };
  return { ok: true as const };
}

/** Responde un comentario por mensaje privado (Messenger o Instagram Direct). Meta permite uno por comentario. */
export async function responderEnPrivado(comentarioId: string, texto: string) {
  const token = TOKEN_PAGINA();
  if (!token) return { ok: false as const, error: "Falta META_PAGE_ACCESS_TOKEN en Vercel." };
  const res = await fetch(`${GRAPH}/me/messages?access_token=${encodeURIComponent(token)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id: comentarioId }, message: { text: texto } }),
  });
  const j = (await res.json().catch(() => ({}))) as { error?: { message?: string; error_user_msg?: string } };
  if (!res.ok) return { ok: false as const, error: j.error?.error_user_msg || j.error?.message || "Meta rechazó el mensaje privado." };
  return { ok: true as const };
}
