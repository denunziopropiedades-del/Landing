import { NextResponse } from "next/server";
import { reservaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

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

  let loteNombre = "";
  let manzana = "";

  if (supabase) {
    const { data: lote } = await supabase
      .from("lotes")
      .select("nombre, manzana, numero, estado")
      .eq("id", data.loteId)
      .maybeSingle();

    if (!lote || lote.estado !== "disponible") {
      return NextResponse.json({ error: "El lote seleccionado ya no está disponible." }, { status: 409 });
    }

    loteNombre = `${lote.nombre} (Lote ${lote.numero})`;
    manzana = lote.manzana;

    const { error } = await supabase.from("leads").insert({
      tipo: "reserva",
      proyecto_id: data.proyectoId,
      lote_id: data.loteId,
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      telefono: data.telefono,
      manzana,
      estado: "nuevo",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try {
    await sendNotificationEmail(
      `Nueva reserva: ${data.nombre} ${data.apellido}${manzana ? ` — Manzana ${manzana}` : ""}`,
      `<h2>Nueva reserva online</h2>
       <ul>
         <li><b>Nombre:</b> ${data.nombre} ${data.apellido}</li>
         <li><b>DNI:</b> ${data.dni}</li>
         <li><b>Email:</b> ${data.email}</li>
         <li><b>Teléfono:</b> ${data.telefono}</li>
         <li><b>Lote:</b> ${loteNombre || data.loteId}</li>
       </ul>`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de notificación", err);
  }

  return NextResponse.json({ ok: true });
}
