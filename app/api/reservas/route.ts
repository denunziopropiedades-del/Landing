import { NextResponse } from "next/server";
import { reservaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { armarMailBienvenidaReserva, sendEmail, sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";
import { registrarActividadSistema } from "@/lib/admin/activity";
import { enviarEventoConversion } from "@/lib/meta-capi";

export async function POST(request: Request) {
  const rate = await checkRateLimit(request, "reservas");
  if (!rate.success) {
    return NextResponse.json({ error: "Demasiadas solicitudes. Probá de nuevo en unos minutos." }, { status: 429 });
  }

  const body = await request.json();
  const parsed = reservaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const supabase = await getSupabaseAdminClient();

  let lotesReservados: { numero: string; manzana: string; superficieM2: number }[] = [];
  let proyectoNombre = "";
  let manzana = "";
  let leadId: string | null = null;

  if (supabase) {
    const { data: leadIdCreado, error: rpcError } = await supabase.rpc("reservar_lotes", {
      p_lote_ids: data.loteIds,
      p_proyecto_id: data.proyectoId,
      p_nombre: data.nombre,
      p_apellido: data.apellido,
      p_dni: data.dni,
      p_email: data.email,
      p_telefono: data.telefono,
    });

    if (rpcError || !leadIdCreado) {
      return NextResponse.json(
        { error: rpcError?.message ?? "Uno o más lotes seleccionados ya no están disponibles." },
        { status: 409 }
      );
    }

    const [{ data: lotes }, { data: proyecto }] = await Promise.all([
      supabase.from("lotes").select("numero, manzana, superficie_m2").in("id", data.loteIds),
      supabase.from("proyectos").select("nombre").eq("id", data.proyectoId).maybeSingle(),
    ]);

    lotesReservados = (lotes ?? []).map((l) => ({ numero: l.numero, manzana: l.manzana, superficieM2: l.superficie_m2 }));
    proyectoNombre = proyecto?.nombre ?? "";
    manzana = lotesReservados[0]?.manzana ?? "";
    leadId = leadIdCreado as string;

    await registrarActividadSistema("crear", "lead", leadId, {
      origen: "reserva online",
      ...(manzana ? { manzana } : {}),
      lote: lotesReservados.map((l) => l.numero).join(", "),
    });

    enviarEventoConversion({
      nombreEvento: "Lead",
      email: data.email,
      telefono: data.telefono,
      urlOrigen: request.headers.get("referer") ?? undefined,
    }).catch((err) => console.error("No se pudo enviar el evento de conversión a Meta", err));
  }

  const listaLotesTexto = lotesReservados.map((l) => `Lote ${l.numero} (${l.superficieM2} m²)`).join(", ");

  try {
    await sendNotificationEmail(
      `Nueva reserva: ${data.nombre} ${data.apellido}${manzana ? ` — Manzana ${manzana}` : ""}`,
      `<h2>Nueva reserva online</h2>
       <ul>
         <li><b>Nombre:</b> ${data.nombre} ${data.apellido}</li>
         <li><b>DNI:</b> ${data.dni}</li>
         <li><b>Email:</b> ${data.email}</li>
         <li><b>Teléfono:</b> ${data.telefono}</li>
         <li><b>Lotes (${lotesReservados.length}):</b> ${listaLotesTexto || data.loteIds.join(", ")}</li>
       </ul>`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de notificación", err);
  }

  if (lotesReservados.length > 0) {
    try {
      await sendEmail(
        data.email,
        `Confirmamos tu reserva en ${proyectoNombre}`,
        armarMailBienvenidaReserva({
          nombre: data.nombre,
          proyectoNombre,
          manzana,
          lotes: lotesReservados,
        })
      );
    } catch (err) {
      console.error("No se pudo enviar el mail de bienvenida al cliente", err);
    }
  }

  return NextResponse.json({ ok: true, leadId });
}
