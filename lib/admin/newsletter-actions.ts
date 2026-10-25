"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requireRole, AdminActionError } from "@/lib/admin/auth";
import { registrarActividad } from "@/lib/admin/activity";
import { sendEmailsMasivos } from "@/lib/email";
import {
  armarHtmlNewsletter,
  calcularAudiencia,
  linkBajaUnClic,
  type ContenidoNewsletter,
} from "@/lib/newsletter";

type Resultado<T = object> = ({ ok: true } & T) | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof AdminActionError) return { ok: false, error: err.message };
  if (err instanceof Error && err.message) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Ocurrió un error inesperado. Intentá nuevamente." };
}

const FALTA_SQL = "Antes del primer envío hay que correr sql-newsletter.sql en Supabase (SQL Editor).";

export type ResumenAudiencia = {
  total: number;
  excluidosClientes: number;
  excluidosBajas: number;
  muestra: string[];
  faltaTablaBajas: boolean;
};

export type EnvioNewsletter = {
  id: string;
  creadoEn: string;
  asunto: string;
  linkUrl: string | null;
  destinatarios: number;
  enviados: number;
  fallidos: number;
};

function validar(c: ContenidoNewsletter): ContenidoNewsletter {
  const limpio = {
    asunto: c.asunto.trim(),
    titulo: c.titulo.trim(),
    texto: c.texto.trim(),
    imagenUrl: c.imagenUrl.trim(),
    linkUrl: c.linkUrl.trim(),
    textoBoton: c.textoBoton.trim() || "Ver más",
  };
  if (!limpio.asunto) throw new AdminActionError("Falta el asunto del mail.");
  if (!limpio.imagenUrl && !limpio.texto) throw new AdminActionError("Subí una imagen o escribí un texto.");
  if (!limpio.linkUrl) throw new AdminActionError("Elegí a qué página lleva el newsletter.");
  try {
    const u = new URL(limpio.linkUrl, "https://matulotes.app");
    if (!/^https?:$/.test(u.protocol)) throw new Error();
  } catch {
    throw new AdminActionError("El link de destino no es válido.");
  }
  return limpio;
}

/** A cuántas personas les llegaría el newsletter (visitas agendadas que no son clientes ni se dieron de baja). */
export async function getAudienciaNewsletterAction(): Promise<Resultado<{ audiencia: ResumenAudiencia }>> {
  try {
    await requireRole("administrador", "supervisor");
    const admin = (await getSupabaseAdminClient())!;
    const a = await calcularAudiencia(admin);
    return {
      ok: true,
      audiencia: {
        total: a.destinatarios.length,
        excluidosClientes: a.excluidosClientes,
        excluidosBajas: a.excluidosBajas,
        muestra: a.destinatarios.slice(0, 8).map((d) => (d.nombre ? `${d.nombre} <${d.email}>` : d.email)),
        faltaTablaBajas: a.faltaTablaBajas,
      },
    };
  } catch (err) {
    return fail(err);
  }
}

/** Últimos newsletters enviados (vacío si todavía no se corrió el SQL). */
export async function getEnviosNewsletter(): Promise<EnvioNewsletter[]> {
  const admin = await getSupabaseAdminClient();
  if (!admin) return [];
  const { data, error } = await admin
    .from("newsletter_envios")
    .select("id, creado_en, asunto, link_url, destinatarios, enviados, fallidos")
    .order("creado_en", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map((e) => ({
    id: e.id,
    creadoEn: e.creado_en,
    asunto: e.asunto,
    linkUrl: e.link_url,
    destinatarios: e.destinatarios,
    enviados: e.enviados,
    fallidos: e.fallidos,
  }));
}

/** Manda el newsletter solo a quien lo está armando, para revisarlo antes del envío real. */
export async function enviarPruebaNewsletterAction(contenido: ContenidoNewsletter): Promise<Resultado<{ email: string }>> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const c = validar(contenido);
    const html = armarHtmlNewsletter(c, { nombre: actor.nombre ?? "", email: actor.email });
    const r = await sendEmailsMasivos([{ to: actor.email, subject: `[PRUEBA] ${c.asunto}`, html }]);
    if (r.enviados === 0) throw new Error(r.errores[0] ?? "No se pudo enviar la prueba.");
    return { ok: true, email: actor.email };
  } catch (err) {
    return fail(err);
  }
}

/** Envío real: a todas las visitas agendadas que no son clientes ni se dieron de baja. */
export async function enviarNewsletterAction(
  contenido: ContenidoNewsletter,
  totalConfirmado: number
): Promise<Resultado<{ enviados: number; fallidos: number }>> {
  try {
    const actor = await requireRole("administrador", "supervisor");
    const c = validar(contenido);
    const admin = (await getSupabaseAdminClient())!;

    const audiencia = await calcularAudiencia(admin);
    if (audiencia.faltaTablaBajas) throw new AdminActionError(FALTA_SQL);
    const lista = audiencia.destinatarios;
    if (lista.length === 0) throw new AdminActionError("No hay destinatarios para enviar.");
    // Si la lista cambió mucho desde que se confirmó (ej. otra pestaña), se frena.
    if (Math.abs(lista.length - totalConfirmado) > 5)
      throw new AdminActionError(`La lista cambió (ahora son ${lista.length} contactos). Revisá y confirmá de nuevo.`);

    const { data: envio, error: errEnvio } = await admin
      .from("newsletter_envios")
      .insert({
        asunto: c.asunto,
        titulo: c.titulo || null,
        imagen_url: c.imagenUrl || null,
        link_url: c.linkUrl,
        destinatarios: lista.length,
        enviado_por: actor.id,
      })
      .select("id")
      .single();
    if (errEnvio) throw new AdminActionError(/newsletter_envios/.test(errEnvio.message) ? FALTA_SQL : errEnvio.message);

    const resultado = await sendEmailsMasivos(
      lista.map((d) => ({
        to: d.email,
        subject: c.asunto,
        html: armarHtmlNewsletter(c, d),
        headers: {
          "List-Unsubscribe": `<${linkBajaUnClic(d.email)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }))
    );

    await admin
      .from("newsletter_envios")
      .update({ enviados: resultado.enviados, fallidos: resultado.fallidos })
      .eq("id", envio.id);
    await registrarActividad(actor, "enviar-newsletter", "newsletter", envio.id, {
      asunto: c.asunto,
      link: c.linkUrl,
      enviados: resultado.enviados,
      fallidos: resultado.fallidos,
      ...(resultado.errores.length ? { error: resultado.errores[0] } : {}),
    });
    revalidatePath("/admin/newsletter");

    if (resultado.enviados === 0) throw new Error(resultado.errores[0] ?? "No se pudo enviar ningún mail.");
    return { ok: true, enviados: resultado.enviados, fallidos: resultado.fallidos };
  } catch (err) {
    return fail(err);
  }
}
