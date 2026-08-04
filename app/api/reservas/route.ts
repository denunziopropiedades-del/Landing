import { NextResponse } from "next/server";
import { reservaSchema } from "@/lib/schemas";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendNotificationEmail } from "@/lib/email";
import { lotes } from "@/lib/data";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = reservaSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;
  const lote = lotes.find((l) => l.id === data.lote);

  const supabase = await getSupabaseAdminClient();
  if (supabase) {
    const { error } = await supabase.from("leads").insert({
      tipo: "reserva",
      nombre: data.nombre,
      apellido: data.apellido,
      dni: data.dni,
      email: data.email,
      telefono: data.telefono,
      manzana: data.manzana,
      lote: lote?.nombre ?? data.lote,
      estado: "nuevo",
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  try {
    await sendNotificationEmail(
      `Nueva reserva: ${data.nombre} ${data.apellido} — Manzana ${data.manzana}`,
      `<h2>Nueva reserva online</h2>
       <ul>
         <li><b>Nombre:</b> ${data.nombre} ${data.apellido}</li>
         <li><b>DNI:</b> ${data.dni}</li>
         <li><b>Email:</b> ${data.email}</li>
         <li><b>Teléfono:</b> ${data.telefono}</li>
         <li><b>Manzana:</b> ${data.manzana}</li>
         <li><b>Lote:</b> ${lote?.nombre ?? data.lote}</li>
       </ul>`
    );
  } catch (err) {
    console.error("No se pudo enviar el email de notificación", err);
  }

  return NextResponse.json({ ok: true });
}
