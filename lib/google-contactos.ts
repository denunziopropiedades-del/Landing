import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizarTelefono } from "@/lib/leads";

/**
 * Guarda los clientes del CRM en Google Contactos de la cuenta de la inmobiliaria,
 * como "Nombre Apellido Cte web" con su teléfono y mail.
 *
 * Necesita un ID de cliente OAuth de Google (GOOGLE_OAUTH_CLIENT_ID / _SECRET) y que el
 * dueño de la cuenta autorice una vez desde el panel (queda guardado el refresh token).
 */

export const SCOPES_CONTACTOS = ["https://www.googleapis.com/auth/contacts", "openid", "email"];
export const SUFIJO = "Cte web";

export const oauthConfigurado = () => !!(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET);
export const redirectUri = () =>
  `${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "")}/api/google/contactos/callback`;

let cache: { token: string; vence: number } | null = null;

async function accessToken(a: SupabaseClient): Promise<string | null> {
  if (!oauthConfigurado()) return null;
  if (cache && cache.vence > Date.now() + 60_000) return cache.token;
  const { data: cfg } = await a.from("google_contactos_config").select("refresh_token").eq("id", 1).maybeSingle();
  if (!cfg?.refresh_token) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: String(cfg.refresh_token),
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) {
    console.error("Google Contactos: no se pudo renovar el acceso", await res.text());
    return null;
  }
  const j = (await res.json()) as { access_token: string; expires_in: number };
  cache = { token: j.access_token, vence: Date.now() + j.expires_in * 1000 };
  return j.access_token;
}

type LeadContacto = { id: string; nombre: string | null; apellido: string | null; email: string | null; telefono: string | null; telefono_norm?: string | null };

function persona(l: LeadContacto) {
  const tel = normalizarTelefono(l.telefono ?? "");
  return {
    names: [{ givenName: (l.nombre ?? "").trim() || "Cliente", familyName: [(l.apellido ?? "").trim(), SUFIJO].filter(Boolean).join(" ") }],
    ...(l.telefono ? { phoneNumbers: [{ value: tel.length === 10 ? `+54 9 ${tel}` : l.telefono, type: "mobile" }] } : {}),
    ...(l.email ? { emailAddresses: [{ value: l.email, type: "home" }] } : {}),
    biographies: [{ value: "Cliente cargado desde la web / CRM (matulotes.app).", contentType: "TEXT_PLAIN" }],
  };
}

/**
 * Crea en Google Contactos los clientes que todavía no están.
 * Si otra ficha con el mismo teléfono ya tiene contacto, se reutiliza (no se duplica).
 */
export async function sincronizarContactos(opciones: { ids?: string[]; soloDesdeConexion?: boolean; limite?: number } = {}) {
  const a = await getSupabaseAdminClient();
  if (!a) return { creados: 0, reutilizados: 0, errores: 0, pendientes: 0 };
  const token = await accessToken(a);
  if (!token) return { creados: 0, reutilizados: 0, errores: 0, pendientes: 0, sinConexion: true };

  let q = a
    .from("leads")
    .select("id, nombre, apellido, email, telefono, telefono_norm, creado_en")
    .is("google_contacto_id", null)
    .order("creado_en", { ascending: true })
    .limit(Math.min(opciones.limite ?? 150, 200));
  if (opciones.ids?.length) q = q.in("id", opciones.ids);
  if (opciones.soloDesdeConexion) {
    const { data: cfg } = await a.from("google_contactos_config").select("conectado_en").eq("id", 1).maybeSingle();
    if (cfg?.conectado_en) q = q.gte("creado_en", cfg.conectado_en as string);
  }
  const { data: pendientes } = await q;
  const lista = ((pendientes ?? []) as LeadContacto[]).filter((l) => (l.telefono ?? "").trim() || (l.email ?? "").trim());
  if (!lista.length) return { creados: 0, reutilizados: 0, errores: 0, pendientes: 0 };

  // Reutiliza contactos ya creados para el mismo teléfono.
  const tels = [...new Set(lista.map((l) => l.telefono_norm).filter((t): t is string => !!t && t.length >= 8))];
  const existentes = new Map<string, string>();
  if (tels.length) {
    const { data } = await a.from("leads").select("telefono_norm, google_contacto_id").in("telefono_norm", tels).not("google_contacto_id", "is", null);
    for (const r of data ?? []) existentes.set(String(r.telefono_norm), String(r.google_contacto_id));
  }
  let reutilizados = 0;
  const aCrear: LeadContacto[] = [];
  const vistos = new Map<string, LeadContacto[]>();
  for (const l of lista) {
    const t = l.telefono_norm && l.telefono_norm.length >= 8 ? l.telefono_norm : null;
    if (t && existentes.has(t)) {
      await a.from("leads").update({ google_contacto_id: existentes.get(t), google_contacto_error: null }).eq("id", l.id);
      reutilizados++;
    } else if (t && vistos.has(t)) {
      vistos.get(t)!.push(l); // mismo teléfono en este lote: un solo contacto
    } else {
      if (t) vistos.set(t, [l]);
      aCrear.push(l);
    }
  }

  let creados = 0;
  let errores = 0;
  for (let i = 0; i < aCrear.length; i += 50) {
    const tanda = aCrear.slice(i, i + 50);
    const res = await fetch("https://people.googleapis.com/v1/people:batchCreateContacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: tanda.map((l) => ({ contactPerson: persona(l) })), readMask: "names" }),
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 300);
      console.error("Google Contactos: error al crear", txt);
      await a.from("leads").update({ google_contacto_error: txt }).in("id", tanda.map((l) => l.id));
      errores += tanda.length;
      continue;
    }
    const j = (await res.json()) as { createdPeople?: { person?: { resourceName?: string } }[] };
    for (let k = 0; k < tanda.length; k++) {
      const rn = j.createdPeople?.[k]?.person?.resourceName;
      const l = tanda[k];
      const mismos = l.telefono_norm && vistos.get(l.telefono_norm) ? vistos.get(l.telefono_norm)! : [l];
      if (rn) {
        await a.from("leads").update({ google_contacto_id: rn, google_contacto_error: null }).in("id", mismos.map((x) => x.id));
        creados++;
        reutilizados += mismos.length - 1;
      } else errores++;
    }
  }
  return { creados, reutilizados, errores, pendientes: lista.length };
}

/** Después de responder, guarda en Google Contactos al cliente recién creado (si la cuenta está conectada). */
export function guardarContactoDespues(leadId: string | null | undefined) {
  if (!leadId || !oauthConfigurado()) return;
  const tarea = async () => {
    try {
      await sincronizarContactos({ ids: [leadId], soloDesdeConexion: true, limite: 5 });
    } catch (err) {
      console.error("Google Contactos: no se pudo guardar el cliente", err);
    }
  };
  try {
    after(tarea);
  } catch {
    void tarea();
  }
}
