import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cancelarEventoVisita, crearEventoEscribania } from "@/lib/google-calendar";
import { bloqueadoPorEscribania } from "@/lib/agenda";
import { armarMailFirmaEscribania, sendEmail } from "@/lib/email";

/**
 * Firma en escribanía: agendado (desde el CRM o elegido por el cliente con su link)
 * y link para que el cliente elija día y horario validando su DNI.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://matulotes.app").replace(/\/+$/, "");
export const DIAS_VIGENCIA_LINK_FIRMA = 15;
export const MAX_INTENTOS_DNI = 5;
/** Turnos de firma: cada 30 minutos, correlativos, de 10:00 a 16:00 (último turno). */
export const INTERVALO_TURNOS_FIRMA = 30;
const HORARIOS_DEFECTO = Array.from({ length: (16 * 60 - 10 * 60) / INTERVALO_TURNOS_FIRMA + 1 }, (_, i) => {
  const m = 10 * 60 + i * INTERVALO_TURNOS_FIRMA;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
});
const DIAS_DEFECTO = 21;

export type TurnoFirma = { fecha: string; horario: string };

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
export const soloDigitos = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
export const urlLinkFirma = (token: string) => `${SITE}/firma/${token}`;

const hoyAr = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
const ahoraMinAr = () => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Argentina/Buenos_Aires", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  const [h, m] = p.split(":").map(Number);
  return h * 60 + m;
};
const aMin = (h: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(h);
  return m ? Number(m[1]) * 60 + Number(m[2]) : -1;
};

/** Agenda (o cambia) la firma: evento en el calendario, mail al cliente y datos en la ficha. */
export async function agendarFirmaEscribania(admin: SupabaseClient, id: string, fecha: string, horario: string) {
  const { data: lead } = await admin
    .from("leads")
    .select(
      "nombre, apellido, email, manzana, escribania_calendar_event_id, lotes(manzana, numero), lead_lotes(lotes(manzana, numero, superficie_m2)), proyectos(nombre, escribania_nombre, escribania_direccion, escribania_maps_url, escribania_instrucciones, documentos_requeridos)"
    )
    .eq("id", id)
    .maybeSingle();

  // Si ya había un evento (fecha/horario anteriores) se borra y se crea uno nuevo: nunca queda duplicado.
  if (lead?.escribania_calendar_event_id) {
    await cancelarEventoVisita(lead.escribania_calendar_event_id);
  }

  const fechaLimpia = fecha || "";
  const horarioLimpio = horario.trim();
  let eventId: string | null = null;

  const loteSingular = lead?.lotes as unknown as { manzana: string; numero: string } | null;
  const lotesOperacion = (
    (lead?.lead_lotes ?? []) as unknown as { lotes: { manzana: string; numero: string; superficie_m2: number } | null }[]
  )
    .map((ll) => ll.lotes)
    .filter((lo): lo is NonNullable<typeof lo> => lo !== null);

  if (fechaLimpia && horarioLimpio && lead) {
    const proyecto = lead.proyectos as unknown as {
      nombre: string;
      escribania_nombre: string | null;
      escribania_direccion: string | null;
      escribania_maps_url: string | null;
      escribania_instrucciones: string | null;
      documentos_requeridos: string[] | null;
    } | null;

    eventId = await crearEventoEscribania({
      nombreCliente: `${lead.nombre} ${lead.apellido ?? ""}`.trim(),
      fecha: fechaLimpia,
      horario: horarioLimpio,
      manzana: loteSingular?.manzana ?? lead.manzana ?? undefined,
      lote: loteSingular?.numero ?? undefined,
      proyectoNombre: proyecto?.nombre,
    });

    if (lead.email) {
      try {
        await sendEmail(
          lead.email,
          `Confirmamos el día y horario de tu firma — ${proyecto?.nombre ?? ""}`,
          armarMailFirmaEscribania({
            nombre: lead.nombre,
            proyectoNombre: proyecto?.nombre ?? "",
            manzana: loteSingular?.manzana ?? lead.manzana ?? "",
            lotes:
              lotesOperacion.length > 0
                ? lotesOperacion.map((lo) => ({ numero: lo.numero, superficieM2: lo.superficie_m2 }))
                : loteSingular
                  ? [{ numero: loteSingular.numero, superficieM2: 0 }]
                  : [],
            fecha: fechaLimpia,
            horario: horarioLimpio,
            escribaniaNombre: proyecto?.escribania_nombre ?? null,
            escribaniaDireccion: proyecto?.escribania_direccion ?? null,
            escribaniaMapsUrl: proyecto?.escribania_maps_url ?? null,
            escribaniaInstrucciones: proyecto?.escribania_instrucciones ?? null,
            documentosRequeridos: proyecto?.documentos_requeridos ?? [],
          })
        );
      } catch (err) {
        console.error("No se pudo enviar el mail de firma en escribanía", err);
      }
    }
  }

  const { error } = await admin
    .from("leads")
    .update({
      fecha_firma_escribania: fechaLimpia || null,
      horario_firma_escribania: horarioLimpio || null,
      escribania_calendar_event_id: eventId,
      actualizado_en: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  const numerosLote = lotesOperacion.length > 0 ? lotesOperacion.map((lo) => lo.numero) : loteSingular ? [loteSingular.numero] : [];
  const manzana = (lead?.manzana as string | null) ?? loteSingular?.manzana ?? null;

  // La escribanía tiene prioridad: se guarda igual, pero se avisa qué visitas del día quedan
  // dentro del margen de 2 hs antes / 2 hs después.
  let aviso: string | undefined;
  if (fechaLimpia && horarioLimpio) {
    const { data: visitasDelDia } = await admin
      .from("visitas")
      .select("nombre, telefono, horario")
      .eq("fecha", fechaLimpia)
      .neq("estado", "cancelada");
    const enConflicto = (visitasDelDia ?? []).filter((v) => bloqueadoPorEscribania(v.horario as string, [horarioLimpio]));
    if (enConflicto.length > 0) {
      aviso =
        `La firma quedó guardada (la escribanía tiene prioridad), pero estas visitas del ${fechaLimpia} ` +
        `caen dentro de las 2 hs antes/después y hay que reprogramarlas:\n` +
        enConflicto
          .sort((a, b) => String(a.horario).localeCompare(String(b.horario)))
          .map((v) => `• ${v.horario} hs — ${v.nombre} (${v.telefono})`)
          .join("\n") +
        `\n\nCada cliente tiene en su mail de confirmación el link para elegir otro horario.`;
    }
  }

  return { aviso, numerosLote, manzana, nombre: lead ? `${lead.nombre} ${lead.apellido ?? ""}`.trim() : "" };
}

/** Crea un link nuevo (invalida el anterior). `opciones` vacío = turnos por defecto. */
export async function crearLinkFirma(admin: SupabaseClient, leadId: string, opciones: TurnoFirma[]) {
  const token = crypto.randomBytes(24).toString("base64url");
  const vence = new Date(Date.now() + DIAS_VIGENCIA_LINK_FIRMA * 86400000).toISOString();
  const limpias = opciones
    .filter((o) => /^\d{4}-\d{2}-\d{2}$/.test(o.fecha) && /^\d{2}:\d{2}$/.test(o.horario))
    .sort((a, b) => `${a.fecha}${a.horario}`.localeCompare(`${b.fecha}${b.horario}`));
  const { error } = await admin
    .from("leads")
    .update({
      firma_link_hash: sha256(token),
      firma_link_vence: vence,
      firma_link_opciones: limpias.length > 0 ? limpias : null,
      firma_link_intentos: 0,
      firma_elegida_en: null,
    })
    .eq("id", leadId);
  if (error) throw new Error(error.message);
  return { url: urlLinkFirma(token), vence };
}

export type LeadLinkFirma = {
  id: string;
  nombre: string;
  apellido: string | null;
  dni: string | null;
  proyecto: string | null;
  fechaFirma: string | null;
  horarioFirma: string | null;
  opciones: TurnoFirma[] | null;
  intentos: number;
  vence: string;
};

/** Lead del link (null si no existe o venció). */
export async function resolverLinkFirma(admin: SupabaseClient, token: string): Promise<LeadLinkFirma | null> {
  if (!token || token.length < 20) return null;
  const { data } = await admin
    .from("leads")
    .select("id, nombre, apellido, dni, fecha_firma_escribania, horario_firma_escribania, firma_link_opciones, firma_link_intentos, firma_link_vence, proyectos(nombre)")
    .eq("firma_link_hash", sha256(token))
    .maybeSingle();
  if (!data || !data.firma_link_vence || Date.parse(data.firma_link_vence as string) < Date.now()) return null;
  return {
    id: data.id as string,
    nombre: data.nombre as string,
    apellido: (data.apellido as string | null) ?? null,
    dni: (data.dni as string | null) ?? null,
    proyecto: (data.proyectos as unknown as { nombre: string } | null)?.nombre ?? null,
    fechaFirma: (data.fecha_firma_escribania as string | null) ?? null,
    horarioFirma: (data.horario_firma_escribania as string | null)?.slice(0, 5) ?? null,
    opciones: (data.firma_link_opciones as TurnoFirma[] | null) ?? null,
    intentos: Number(data.firma_link_intentos ?? 0),
    vence: data.firma_link_vence as string,
  };
}

/** Turnos que el cliente puede elegir: los ofrecidos (o los por defecto), sin pasados ni ocupados por otra firma. */
export async function turnosDisponiblesFirma(admin: SupabaseClient, lead: LeadLinkFirma): Promise<{ fecha: string; horarios: string[] }[]> {
  const hoy = hoyAr();
  let candidatos: TurnoFirma[] = lead.opciones ?? [];
  if (candidatos.length === 0) {
    const base = new Date(`${hoy}T12:00:00Z`);
    for (let i = 1; i <= DIAS_DEFECTO; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const dow = d.getUTCDay();
      if (dow === 0 || dow === 6) continue;
      const fecha = d.toISOString().slice(0, 10);
      for (const horario of HORARIOS_DEFECTO) candidatos.push({ fecha, horario });
    }
  }
  const ahora = ahoraMinAr();
  candidatos = candidatos.filter((c) => c.fecha > hoy || (c.fecha === hoy && aMin(c.horario) > ahora + 120));
  if (candidatos.length === 0) return [];

  const fechas = [...new Set(candidatos.map((c) => c.fecha))];
  const { data: ocupadas } = await admin
    .from("leads")
    .select("fecha_firma_escribania, horario_firma_escribania")
    .in("fecha_firma_escribania", fechas)
    .neq("id", lead.id)
    .not("horario_firma_escribania", "is", null);
  const ocupado = (c: TurnoFirma) =>
    (ocupadas ?? []).some(
      (o) =>
        o.fecha_firma_escribania === c.fecha &&
        Math.abs(aMin(String(o.horario_firma_escribania)) - aMin(c.horario)) < INTERVALO_TURNOS_FIRMA
    );

  const porFecha = new Map<string, string[]>();
  for (const c of candidatos) {
    if (ocupado(c)) continue;
    porFecha.set(c.fecha, [...(porFecha.get(c.fecha) ?? []), c.horario]);
  }
  return [...porFecha.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, horarios]) => ({ fecha, horarios: horarios.sort() }));
}
