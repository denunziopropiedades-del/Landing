/**
 * Llamadas al modelo de IA a través de Vercel AI Gateway (API compatible con OpenAI).
 *
 * Autenticación (en este orden):
 *   1. AI_GATEWAY_API_KEY, si está cargada en Vercel.
 *   2. El token OIDC que Vercel entrega a cada función (cabecera x-vercel-oidc-token
 *      o variable VERCEL_OIDC_TOKEN). No hace falta cargar ninguna clave.
 */

const URL_GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";
export const MODELO_POR_DEFECTO = "anthropic/claude-haiku-5.5";

export type MensajeLLM =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: LlamadaHerramienta[] }
  | { role: "tool"; tool_call_id: string; content: string };

export type LlamadaHerramienta = { id: string; type: "function"; function: { name: string; arguments: string } };

export type Herramienta = {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
};

export function tokenGateway(tokenPedido?: string | null): string | null {
  return process.env.AI_GATEWAY_API_KEY || tokenPedido || process.env.VERCEL_OIDC_TOKEN || null;
}

export async function completar(opts: {
  token: string;
  modelo: string;
  mensajes: MensajeLLM[];
  herramientas?: Herramienta[];
  maxTokens?: number;
}): Promise<{ mensaje: Extract<MensajeLLM, { role: "assistant" }>; tokens: number }> {
  const res = await fetch(URL_GATEWAY, {
    method: "POST",
    headers: { Authorization: `Bearer ${opts.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: opts.modelo,
      messages: opts.mensajes,
      ...(opts.herramientas?.length ? { tools: opts.herramientas, tool_choice: "auto" } : {}),
      max_tokens: opts.maxTokens ?? 900,
      temperature: 0.5,
      // Caché automática: la parte fija (datos del negocio y catálogo) se cobra mucho menos.
      providerOptions: { gateway: { caching: "auto" } },
    }),
  });
  const json = (await res.json().catch(() => ({}))) as {
    choices?: { message?: { content?: string | null; tool_calls?: LlamadaHerramienta[] } }[];
    usage?: { total_tokens?: number };
    error?: { message?: string } | string;
  };
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : json.error?.message;
    throw new Error(`IA: ${msg ?? res.statusText}`);
  }
  const m = json.choices?.[0]?.message ?? {};
  return {
    mensaje: { role: "assistant", content: m.content ?? null, ...(m.tool_calls?.length ? { tool_calls: m.tool_calls } : {}) },
    tokens: json.usage?.total_tokens ?? 0,
  };
}
