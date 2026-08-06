import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";

export const runtime = "nodejs";

const ZONA = "America/Argentina/Buenos_Aires";

function hoyEnArgentina(): { anio: number; mes: number; dia: number } {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const obtener = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value);
  return { anio: obtener("year"), mes: obtener("month") - 1, dia: obtener("day") };
}

/** Devuelve el mes (0-indexado) y día del tercer domingo de un mes/año dado. */
function tercerDomingo(mes: number, anio: number): { mes: number; dia: number } {
  const primero = new Date(Date.UTC(anio, mes, 1));
  const primerDomingo = 1 + ((7 - primero.getUTCDay()) % 7);
  return { mes, dia: primerDomingo + 14 };
}

function cumpleHoy(fechaNacimiento: string, mes: number, dia: number): boolean {
  const partes = fechaNacimiento.split("-").map(Number);
  const m = partes[1];
  const d = partes[2];
  return m - 1 === mes && d === dia;
}

function plantillaEmail(titulo: string, cuerpo: string) {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #154a2e;">${titulo}</h2>
      <p style="color: #333; line-height: 1.6;">${cuerpo}</p>
    </div>
  `;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const auth = request.headers.get("authorization");
  const autorizado =
    !process.env.CRON_SECRET ||
    auth === `Bearer ${process.env.CRON_SECRET}` ||
    searchParams.get("secret") === process.env.CRON_SECRET;

  if (!autorizado) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = await getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, motivo: "Supabase no configurado" });
  }

  const { anio, mes, dia } = hoyEnArgentina();
  const padre = tercerDomingo(5, anio); // junio
  const madre = tercerDomingo(9, anio); // octubre

  const esNavidad = mes === 11 && dia === 25;
  const esAnioNuevo = mes === 0 && dia === 1;
  const esDiaDelPadre = mes === padre.mes && dia === padre.dia;
  const esDiaDeLaMadre = mes === madre.mes && dia === madre.dia;

  const { data: clientes, error } = await supabase
    .from("leads")
    .select("id, nombre, email, fecha_nacimiento")
    .eq("estado", "vendido")
    .neq("email", "");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let cumpleañosEnviados = 0;
  let especialesEnviados = 0;

  for (const cliente of clientes ?? []) {
    if (!cliente.email) continue;

    if (cliente.fecha_nacimiento && cumpleHoy(cliente.fecha_nacimiento, mes, dia)) {
      await sendEmail(
        cliente.email,
        `¡Feliz cumpleaños, ${cliente.nombre}!`,
        plantillaEmail(
          `¡Feliz cumpleaños, ${cliente.nombre}!`,
          "Todo el equipo de Matu Lotes te desea un muy feliz cumpleaños. Gracias por confiar en nosotros para tu inversión."
        )
      );
      cumpleañosEnviados += 1;
    }

    if (esNavidad) {
      await sendEmail(
        cliente.email,
        "¡Feliz Navidad!",
        plantillaEmail("¡Feliz Navidad!", `${cliente.nombre}, te deseamos una muy feliz Navidad junto a los tuyos.`)
      );
      especialesEnviados += 1;
    }

    if (esAnioNuevo) {
      await sendEmail(
        cliente.email,
        "¡Feliz Año Nuevo!",
        plantillaEmail("¡Feliz Año Nuevo!", `${cliente.nombre}, que este año esté lleno de éxitos. ¡Feliz Año Nuevo!`)
      );
      especialesEnviados += 1;
    }

    if (esDiaDelPadre) {
      await sendEmail(
        cliente.email,
        "¡Feliz Día del Padre!",
        plantillaEmail("¡Feliz Día del Padre!", `${cliente.nombre}, te deseamos un muy feliz Día del Padre.`)
      );
      especialesEnviados += 1;
    }

    if (esDiaDeLaMadre) {
      await sendEmail(
        cliente.email,
        "¡Feliz Día de la Madre!",
        plantillaEmail("¡Feliz Día de la Madre!", `${cliente.nombre}, te deseamos un muy feliz Día de la Madre.`)
      );
      especialesEnviados += 1;
    }
  }

  return NextResponse.json({ ok: true, cumpleañosEnviados, especialesEnviados });
}
