/**
 * Token de la página de Facebook.
 *
 * META_PAGE_ACCESS_TOKEN puede ser:
 *  - el token de la página, o
 *  - el token de un usuario del sistema del negocio (no vence y no depende de la sesión
 *    de nadie). En ese caso se pide a Meta el token de la página (META_PAGE_ID) y se
 *    guarda en memoria un rato.
 */
const GRAPH = "https://graph.facebook.com/v21.0";
export const META_PAGE_ID = process.env.META_PAGE_ID || "866523556534525";

let cache: { token: string; hasta: number; base: string } | null = null;

export async function tokenPagina(): Promise<string | null> {
  const base = process.env.META_PAGE_ACCESS_TOKEN;
  if (!base) return null;
  if (cache && cache.base === base && cache.hasta > Date.now()) return cache.token;
  let token = base;
  try {
    const res = await fetch(`${GRAPH}/${META_PAGE_ID}?fields=access_token&access_token=${encodeURIComponent(base)}`);
    if (res.ok) {
      const j = (await res.json()) as { access_token?: string };
      if (j.access_token) token = j.access_token;
    }
  } catch {
    /* se usa el token tal cual */
  }
  cache = { token, base, hasta: Date.now() + 50 * 60 * 1000 };
  return token;
}
