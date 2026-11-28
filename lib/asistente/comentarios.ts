import type { SupabaseClient } from "@supabase/supabase-js";
import { responderEnPrivado } from "@/lib/comentarios";
import { registrarMensaje } from "@/lib/mensajeria";
import { META_PAGE_ID } from "@/lib/meta-token";
import { tokenGateway } from "./llm";
import { generarRespuesta, leerConfig } from "./motor";

const UN_DIA_MS = 24 * 60 * 60 * 1000;

/**
 * Comentario nuevo en Facebook o Instagram: el asistente le escribe por privado a quien
 * comentó para arrancar la charla. Meta permite un mensaje privado por comentario; cuando la
 * persona contesta, la conversación sigue en Mensajes como cualquier otra.
 */
export async function abrirCharlaDesdeComentario(supabase: SupabaseClient, comentarioId: string, tokenPedido: string | null): Promise<void> {
  const cfg = await leerConfig(supabase);
  if (!cfg.activo || !cfg.comentarios_auto) return;
  const token = tokenGateway(tokenPedido);
  if (!token) return;

  const { data: c } = await supabase
    .from("comentarios")
    .select("id, red, cuenta_id, autor_id, autor_nombre, texto, post_texto, atendido, respondido_en, creado_en")
    .eq("comentario_id", comentarioId)
    .maybeSingle();
  if (!c || c.atendido || c.respondido_en || !c.autor_id) return;
  if (Date.now() - new Date(c.creado_en as string).getTime() > UN_DIA_MS) return; // comentario viejo (reintento de Meta)

  // Una sola vez por persona cada 24 h, aunque comente varias publicaciones.
  const { count } = await supabase
    .from("comentarios")
    .select("id", { count: "exact", head: true })
    .eq("autor_id", c.autor_id)
    .eq("respuesta_privada", true)
    .gte("respondido_en", new Date(Date.now() - UN_DIA_MS).toISOString());
  if (count) return;

  const red = c.red === "instagram" ? "instagram" : "facebook";
  const nombre = ((c.autor_nombre as string) || "").replace(/^@/, "");
  const historial = [
    {
      role: "user" as const,
      content: `[Comentario público en una publicación de ${red === "instagram" ? "Instagram" : "Facebook"}]${
        c.post_texto ? `\nTexto de la publicación: ${c.post_texto}` : ""
      }\nComentario de ${nombre || "la persona"}: ${c.texto || "(sin texto)"}`,
    },
  ];
  const instruccionExtra = `IMPORTANTE: este es el PRIMER mensaje que le mandás por privado a ${nombre || "esta persona"}, en respuesta al comentario que dejó en la publicación. Saludalo por su nombre de pila, decile que viste su comentario y respondé lo que preguntó con los datos de la publicación y del catálogo (si no queda claro de qué propiedad habla, preguntale). Máximo 5 líneas, cálido y concreto, y terminá con una pregunta que invite a seguir la charla. Si el comentario es solo una etiqueta a otra persona o un emoji, ofrecele la info del desarrollo de la publicación. No agendes visitas ni guardes datos en este primer mensaje.`;

  let texto = "";
  let error: string | null = null;
  let tokens = 0;
  try {
    const r = await generarRespuesta({ supabase, cfg, token, historial, instruccionExtra, canal: red === "instagram" ? "instagram" : "messenger", simulacion: true });
    texto = r.texto;
    tokens = r.tokens;
    if (!texto) error = "La IA no generó respuesta.";
  } catch (err) {
    error = err instanceof Error ? err.message : "error";
  }

  if (texto) {
    const envio = await responderEnPrivado(comentarioId, texto);
    if (!envio.ok) error = envio.error;
    else {
      await supabase
        .from("comentarios")
        .update({ atendido: true, respuesta: texto, respuesta_privada: true, respondido_en: new Date().toISOString(), error: null })
        .eq("id", c.id);
      // Deja el mensaje en la bandeja para que el asistente tenga el contexto cuando la persona conteste.
      if (envio.recipientId) {
        await registrarMensaje(supabase, {
          canal: { tipo: red === "instagram" ? "instagram" : "messenger", externalId: red === "instagram" ? (c.cuenta_id as string) : META_PAGE_ID },
          contactoId: envio.recipientId,
          nombre: (c.autor_nombre as string) ?? null,
          direccion: "saliente",
          tipo: "text",
          texto,
          externalId: envio.messageId,
          enviadoDesde: "asistente",
        }).catch(() => null);
      }
    }
  }
  if (error) await supabase.from("comentarios").update({ error }).eq("id", c.id);
  await supabase.from("asistente_log").insert({ conversacion_id: null, tipo: "comentario", salida: texto || null, acciones: [], tokens, error });
}
