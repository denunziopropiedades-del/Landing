const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const LIMITE_DEFAULT = 8;
const VENTANA_SEGUNDOS_DEFAULT = 60;

/** Memoria del proceso: solo sirve como límite de único-nodo (fallback sin Upstash). */
const memoria = new Map<string, { count: number; expiraEn: number }>();

function obtenerIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}

async function checkUpstash(clave: string, limite: number, ventanaSegundos: number): Promise<boolean> {
  const res = await fetch(`${UPSTASH_URL}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", clave],
      ["EXPIRE", clave, String(ventanaSegundos), "NX"],
    ]),
  });

  if (!res.ok) return true; // si Upstash falla, no bloqueamos el tráfico legítimo

  const [incrResult] = (await res.json()) as Array<{ result: number }>;
  return incrResult.result <= limite;
}

function checkMemoria(clave: string, limite: number, ventanaSegundos: number): boolean {
  const ahora = Date.now();
  const entrada = memoria.get(clave);

  if (!entrada || entrada.expiraEn < ahora) {
    memoria.set(clave, { count: 1, expiraEn: ahora + ventanaSegundos * 1000 });
    return true;
  }

  entrada.count += 1;
  return entrada.count <= limite;
}

/**
 * Límite de solicitudes por IP para endpoints públicos (formularios).
 * Usa Upstash Redis (distribuido) si está configurado; si no, cae a un
 * contador en memoria del proceso, suficiente para un único nodo/instancia.
 */
export async function checkRateLimit(
  request: Request,
  bucket: string,
  limite = LIMITE_DEFAULT,
  ventanaSegundos = VENTANA_SEGUNDOS_DEFAULT
): Promise<{ success: boolean }> {
  const ip = obtenerIp(request);
  const clave = `ratelimit:${bucket}:${ip}`;

  const success =
    UPSTASH_URL && UPSTASH_TOKEN
      ? await checkUpstash(clave, limite, ventanaSegundos)
      : checkMemoria(clave, limite, ventanaSegundos);

  return { success };
}
