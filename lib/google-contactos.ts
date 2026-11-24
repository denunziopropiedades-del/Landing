import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { normalizarTelefono, ORIGENES } from "@/lib/leads";

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

const ETAPAS: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  visita_programada: "Visita programada",
  visita_realizada: "Visita realizada",
  reservado: "Reservado",
  pago_confirmado: "Pago confirmado",
  pendiente_firma_escribania: "Pendiente firma escribanía",
  firmado_escribania: "Firmado escribanía",
  vendido: "Vendido",
  descartado: "Descartado",
};
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

type LeadContacto = {
  id: string;
  nombre: string | null;
  apellido: string | null;
  email: string | null;
  telefono: string | null;
  telefono_norm: string | null;
  estado: string | null;
  origen: string | null;
  consultas_unificadas: number | null;
  creado_en: string;
  proyecto_id: string | null;
  propiedad_id: string | null;
  google_contacto_id: string | null;
  google_contacto_tel: string | null;
  google_contacto_nota: string | null;
};
const CAMPOS =
  "id, nombre, apellido, email, telefono, telefono_norm, estado, origen, consultas_unificadas, creado_en, proyecto_id, propiedad_id, google_contacto_id, google_contacto_tel, google_contacto_nota";

type Visita = { lead_id: string; fecha: string; horario: string | null; estado: string | null; proyecto_id: string | null; propiedad_id: string | null };
type Contexto = { proyectos: Map<string, string>; propiedades: Map<string, string>; visitas: Map<string, Visita[]> };

/** Teléfono como se guarda en Google: +54 9 11 2742-4512 (así WhatsApp lo reconoce). */
export function telefonoContacto(telefono: string | null | undefined): string {
  const d = normalizarTelefono(telefono);
  if (d.length !== 10) return String(telefono ?? "").trim();
  if (d.startsWith("11")) return `+54 9 11 ${d.slice(2, 6)}-${d.slice(6)}`;
  return `+54 9 ${d}`;
}
const telValido = (t: string) => !!t && t !== "-";

async function cargarContexto(a: SupabaseClient, leads: LeadContacto[]): Promise<Contexto> {
  const ctx: Contexto = { proyectos: new Map(), propiedades: new Map(), visitas: new Map() };
  const ids = leads.map((l) => l.id);
  for (let i = 0; i < ids.length; i += 150) {
    const { data } = await a
      .from("visitas")
      .select("lead_id, fecha, horario, estado, proyecto_id, propiedad_id")
      .in("lead_id", ids.slice(i, i + 150))
      .order("fecha", { ascending: false });
    for (const v of (data ?? []) as Visita[]) {
      const lista = ctx.visitas.get(v.lead_id) ?? [];
      lista.push(v);
      ctx.visitas.set(v.lead_id, lista);
    }
  }
  const { data: proys } = await a.from("proyectos").select("id, nombre");
  for (const p of proys ?? []) ctx.proyectos.set(String(p.id), String(p.nombre));
  const propIds = [
    ...new Set([...leads.map((l) => l.propiedad_id), ...[...ctx.visitas.values()].flat().map((v) => v.propiedad_id)].filter((x): x is string => !!x)),
  ];
  if (propIds.length) {
    const { data: props } = await a.from("propiedades").select("id, titulo").in("id", propIds);
    for (const p of props ?? []) ctx.propiedades.set(String(p.id), String(p.titulo));
  }
  return ctx;
}

const fechaCorta = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dia = DIAS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${dia} ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

/** Notas del contacto con los datos del CRM: qué consultó, origen, etapa y visitas. */
function notaContacto(grupo: LeadContacto[], ctx: Contexto): string {
  const ord = [...grupo].sort((x, y) => y.creado_en.localeCompare(x.creado_en));
  const l = ord[0];
  const intereses = [
    ...new Set(
      ord
        .flatMap((x) => [x.propiedad_id ? ctx.propiedades.get(x.propiedad_id) : null, x.proyecto_id ? ctx.proyectos.get(x.proyecto_id) : null])
        .filter((x): x is string => !!x)
    ),
  ];
  const consultas = ord.reduce((s, x) => s + 1 + (x.consultas_unificadas ?? 0), 0);
  const visitas = ord
    .flatMap((x) => ctx.visitas.get(x.id) ?? [])
    .sort((x, y) => `${y.fecha}${y.horario ?? ""}`.localeCompare(`${x.fecha}${x.horario ?? ""}`));
  const origen = ORIGENES.find((o) => o.value === l.origen)?.label;
  const lineas = [
    "Cliente del CRM de matulotes.app",
    intereses.length ? `Consultó por: ${intereses.join(" · ")}` : null,
    origen ? `Origen: ${origen}` : null,
    l.estado ? `Etapa: ${ETAPAS[l.estado] ?? l.estado}` : null,
    `Consultas: ${consultas}`,
    visitas.length ? "Visitas:" : null,
    ...visitas.slice(0, 6).map((v) => {
      const lugar = (v.propiedad_id && ctx.propiedades.get(v.propiedad_id)) || (v.proyecto_id && ctx.proyectos.get(v.proyecto_id)) || "";
      return `• ${fechaCorta(v.fecha)} ${v.horario ?? ""} hs · ${v.estado ?? "pendiente"}${lugar ? ` · ${lugar}` : ""}`;
    }),
    `Alta en el CRM: ${fechaCorta(ord[ord.length - 1].creado_en)}`,
  ];
  return lineas.filter(Boolean).join("\n");
}

function persona(l: LeadContacto, nota: string) {
  const tel = telefonoContacto(l.telefono);
  return {
    names: [{ givenName: (l.nombre ?? "").trim() || "Cliente", familyName: [(l.apellido ?? "").trim(), SUFIJO].filter(Boolean).join(" ") }],
    ...(telValido(tel) ? { phoneNumbers: [{ value: tel, type: "mobile" }] } : {}),
    ...(l.email ? { emailAddresses: [{ value: l.email, type: "home" }] } : {}),
    biographies: [{ value: nota, contentType: "TEXT_PLAIN" }],
  };
}

/** El número que Google tenía es el mismo celular (aunque esté mal cargado: con 15, sin 54 9, etc.). */
function esMismoNumero(valor: string | undefined, norm: string) {
  const d = String(valor ?? "").replace(/\D/g, "");
  if (!d || !norm) return false;
  return normalizarTelefono(d) === norm || d.endsWith(norm.slice(-8));
}

type PersonaGoogle = { resourceName?: string; etag?: string; phoneNumbers?: { value?: string; type?: string }[] };

/**
 * Revisa los contactos ya guardados: si no existen en la cuenta conectada (se borraron o se guardaron
 * en otra cuenta) los marca para volver a crearlos; si cambió el teléfono o los datos del CRM, los actualiza.
 */
async function actualizarGuardados(a: SupabaseClient, token: string, opciones: { ids?: string[]; verificar?: boolean }) {
  let q = a.from("leads").select(CAMPOS).not("google_contacto_id", "is", null).limit(2000);
  if (opciones.ids?.length) {
    // Incluye las otras fichas que comparten el mismo contacto.
    const { data: base } = await a.from("leads").select("google_contacto_id").in("id", opciones.ids).not("google_contacto_id", "is", null);
    const rns = [...new Set((base ?? []).map((b) => String(b.google_contacto_id)))];
    if (!rns.length) return { aRecrear: [] as string[], actualizados: 0 };
    q = q.in("google_contacto_id", rns);
  }
  const { data } = await q;
  const leads = (data ?? []) as LeadContacto[];
  if (!leads.length) return { aRecrear: [] as string[], actualizados: 0 };
  const ctx = await cargarContexto(a, leads);

  const grupos = new Map<string, LeadContacto[]>();
  for (const l of leads) {
    const rn = String(l.google_contacto_id);
    grupos.set(rn, [...(grupos.get(rn) ?? []), l]);
  }
  const revisar: { rn: string; ids: string[]; tel: string; nota: string; cambio: boolean }[] = [];
  for (const [rn, grupo] of grupos) {
    const principal = [...grupo].sort((x, y) => y.creado_en.localeCompare(x.creado_en))[0];
    const tel = telefonoContacto(principal.telefono);
    const nota = notaContacto(grupo, ctx);
    const cambio = grupo.some((g) => g.google_contacto_tel !== tel || g.google_contacto_nota !== nota);
    if (opciones.verificar || cambio) revisar.push({ rn, ids: grupo.map((g) => g.id), tel, nota, cambio });
  }

  const aRecrear: string[] = [];
  let actualizados = 0;
  for (let i = 0; i < revisar.length; i += 50) {
    const tanda = revisar.slice(i, i + 50);
    const qs = new URLSearchParams({ personFields: "phoneNumbers,metadata" });
    for (const r of tanda) qs.append("resourceNames", r.rn);
    const get = await fetch(`https://people.googleapis.com/v1/people:batchGet?${qs}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!get.ok) {
      console.error("Google Contactos: no se pudieron leer los contactos", (await get.text()).slice(0, 300));
      continue;
    }
    const gj = (await get.json()) as { responses?: { requestedResourceName?: string; person?: PersonaGoogle }[] };
    const encontrados = new Map<string, PersonaGoogle>();
    for (const r of gj.responses ?? []) {
      const rn = r.requestedResourceName ?? r.person?.resourceName;
      if (rn && r.person?.etag) encontrados.set(rn, r.person);
    }
    const contacts: Record<string, unknown> = {};
    const aActualizar: typeof tanda = [];
    for (const r of tanda) {
      const p = encontrados.get(r.rn);
      if (!p) {
        // No está en la cuenta conectada: se vuelve a crear.
        await a.from("leads").update({ google_contacto_id: null, google_contacto_tel: null, google_contacto_nota: null }).in("id", r.ids);
        aRecrear.push(...r.ids);
        continue;
      }
      if (!r.cambio) continue;
      const norm = normalizarTelefono(r.tel);
      const otros = (p.phoneNumbers ?? []).filter((n) => !esMismoNumero(n.value, norm));
      contacts[r.rn] = {
        etag: p.etag,
        phoneNumbers: [...(telValido(r.tel) ? [{ value: r.tel, type: "mobile" }] : []), ...otros.map((n) => ({ value: n.value, type: n.type }))],
        biographies: [{ value: r.nota, contentType: "TEXT_PLAIN" }],
      };
      aActualizar.push(r);
    }
    if (!aActualizar.length) continue;
    const upd = await fetch("https://people.googleapis.com/v1/people:batchUpdateContacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contacts, updateMask: "phoneNumbers,biographies", readMask: "names" }),
    });
    if (!upd.ok) {
      console.error("Google Contactos: no se pudieron actualizar", (await upd.text()).slice(0, 300));
      continue;
    }
    for (const r of aActualizar) {
      await a.from("leads").update({ google_contacto_tel: r.tel, google_contacto_nota: r.nota, google_contacto_error: null }).in("id", r.ids);
      actualizados++;
    }
  }
  return { aRecrear, actualizados };
}

/** Crea en Google Contactos los clientes que todavía no están (si otra ficha con el mismo teléfono ya tiene contacto, se reutiliza). */
async function crearPendientes(a: SupabaseClient, token: string, opciones: { ids?: string[]; soloDesdeConexion?: boolean; limite?: number }) {
  let q = a
    .from("leads")
    .select(CAMPOS)
    .is("google_contacto_id", null)
    .order("creado_en", { ascending: true })
    .limit(Math.min(opciones.limite ?? 150, 200));
  if (opciones.ids?.length) q = q.in("id", opciones.ids);
  if (opciones.soloDesdeConexion && !opciones.ids?.length) {
    const { data: cfg } = await a.from("google_contactos_config").select("conectado_en").eq("id", 1).maybeSingle();
    if (cfg?.conectado_en) q = q.gte("creado_en", cfg.conectado_en as string);
  }
  const { data: pendientes } = await q;
  const lista = ((pendientes ?? []) as LeadContacto[]).filter((l) => (l.telefono ?? "").trim() || (l.email ?? "").trim());
  if (!lista.length) return { creados: 0, reutilizados: 0, errores: 0, pendientes: 0 };

  // Reutiliza contactos ya creados para el mismo teléfono (después se actualizan sus notas).
  const tels = [...new Set(lista.map((l) => l.telefono_norm).filter((t): t is string => !!t && t.length >= 8))];
  const existentes = new Map<string, string>();
  if (tels.length) {
    const { data } = await a.from("leads").select("telefono_norm, google_contacto_id").in("telefono_norm", tels).not("google_contacto_id", "is", null);
    for (const r of data ?? []) existentes.set(String(r.telefono_norm), String(r.google_contacto_id));
  }
  let reutilizados = 0;
  const aCrear: LeadContacto[][] = [];
  const porTel = new Map<string, LeadContacto[]>();
  for (const l of lista) {
    const t = l.telefono_norm && l.telefono_norm.length >= 8 ? l.telefono_norm : null;
    if (t && existentes.has(t)) {
      await a.from("leads").update({ google_contacto_id: existentes.get(t), google_contacto_error: null, google_contacto_nota: null }).eq("id", l.id);
      reutilizados++;
    } else if (t && porTel.has(t)) {
      porTel.get(t)!.push(l); // mismo teléfono en este lote: un solo contacto
    } else {
      const grupo = [l];
      if (t) porTel.set(t, grupo);
      aCrear.push(grupo);
    }
  }
  if (!aCrear.length) return { creados: 0, reutilizados, errores: 0, pendientes: lista.length };

  const ctx = await cargarContexto(a, aCrear.flat());
  let creados = 0;
  let errores = 0;
  for (let i = 0; i < aCrear.length; i += 50) {
    const tanda = aCrear.slice(i, i + 50).map((grupo) => {
      const principal = [...grupo].sort((x, y) => y.creado_en.localeCompare(x.creado_en))[0];
      return { grupo, principal, nota: notaContacto(grupo, ctx) };
    });
    const res = await fetch("https://people.googleapis.com/v1/people:batchCreateContacts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ contacts: tanda.map((t) => ({ contactPerson: persona(t.principal, t.nota) })), readMask: "names" }),
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 300);
      console.error("Google Contactos: error al crear", txt);
      await a.from("leads").update({ google_contacto_error: txt }).in("id", tanda.flatMap((t) => t.grupo.map((g) => g.id)));
      errores += tanda.length;
      continue;
    }
    const j = (await res.json()) as { createdPeople?: { person?: { resourceName?: string } }[] };
    for (let k = 0; k < tanda.length; k++) {
      const rn = j.createdPeople?.[k]?.person?.resourceName;
      const t = tanda[k];
      if (rn) {
        await a
          .from("leads")
          .update({
            google_contacto_id: rn,
            google_contacto_error: null,
            google_contacto_tel: telefonoContacto(t.principal.telefono) || null,
            google_contacto_nota: t.nota,
          })
          .in("id", t.grupo.map((g) => g.id));
        creados++;
        reutilizados += t.grupo.length - 1;
      } else errores++;
    }
  }
  return { creados, reutilizados, errores, pendientes: lista.length };
}

/**
 * Sincroniza el CRM con Google Contactos:
 * 1) revisa los ya guardados (con `verificar`, confirma que existan en la cuenta conectada) y les actualiza teléfono y notas;
 * 2) crea los que faltan, incluidos los que no estaban en Google.
 */
export async function sincronizarContactos(opciones: { ids?: string[]; soloDesdeConexion?: boolean; limite?: number; verificar?: boolean } = {}) {
  const vacio = { creados: 0, reutilizados: 0, errores: 0, pendientes: 0, actualizados: 0, recreados: 0 };
  const a = await getSupabaseAdminClient();
  if (!a) return vacio;
  const token = await accessToken(a);
  if (!token) return { ...vacio, sinConexion: true };

  let aRecrear: string[] = [];
  let actualizados = 0;
  try {
    ({ aRecrear, actualizados } = await actualizarGuardados(a, token, { ids: opciones.ids, verificar: opciones.verificar }));
  } catch (err) {
    console.error("Google Contactos: error al revisar los guardados", err);
  }
  const r = await crearPendientes(a, token, opciones);
  let recreados = 0;
  for (let i = 0; i < aRecrear.length; i += 200) {
    const r2 = await crearPendientes(a, token, { ids: aRecrear.slice(i, i + 200), limite: 200 });
    recreados += r2.creados + r2.reutilizados;
    r.errores += r2.errores;
  }
  // Fichas que se sumaron a un contacto que ya existía: se le actualizan las notas.
  if (r.reutilizados) {
    try {
      actualizados += (await actualizarGuardados(a, token, { ids: opciones.ids })).actualizados;
    } catch (err) {
      console.error("Google Contactos: error al actualizar notas", err);
    }
  }
  return { ...r, actualizados, recreados };
}

/** Después de responder, guarda o actualiza en Google Contactos al cliente (si la cuenta está conectada). */
export function guardarContactoDespues(leadId: string | null | undefined) {
  if (!leadId || !oauthConfigurado()) return;
  const tarea = async () => {
    try {
      await sincronizarContactos({ ids: [leadId], limite: 5, verificar: true });
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
