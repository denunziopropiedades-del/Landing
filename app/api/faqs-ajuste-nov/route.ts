// Ruta temporal de un solo uso para actualizar las preguntas frecuentes generales.
// Se elimina inmediatamente después de ejecutarla.
import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const TOKEN = "f1ca7dba6e90743777bcf9903bf5dc7f";

const CAMBIOS = [
  {
    viejas: ["¿Tiene escritura?"],
    pregunta: "¿Mi operación es segura?",
    respuesta:
      "Sí, 100%. Cada operación la realiza y la acompaña un profesional: Martillero Público y Corredor Inmobiliario matriculado (COL 7886). Tenés total seguridad jurídica de principio a fin: vos elegís tu propiedad y nosotros nos ocupamos de que todo esté en regla.",
    orden: 1,
  },
  {
    viejas: ["¿Cómo es la financiación?"],
    pregunta: "¿Cómo es la financiación?",
    respuesta:
      "Tenemos varios planes y los ajustamos a tu bolsillo. Contanos cuánto podés pagar y llegamos juntos a un número que nos sirva a ambos. Consultanos sin compromiso: siempre hay una forma de empezar.",
    orden: 2,
  },
  {
    viejas: ["¿Puedo visitar el proyecto?"],
    pregunta: "¿Cuándo puedo visitar?",
    respuesta:
      "¡Todos los días! Elegí el día y el horario que más te convenga en nuestro calendario online y reservá tu visita en menos de un minuto. Te esperamos para que lo conozcas en persona.",
    orden: 3,
  },
  {
    viejas: ["¿Cómo se reserva un lote?"],
    pregunta: "¿Cómo reservo mi lote?",
    respuesta:
      "Es muy simple: elegí manzana y lote en la web y reservalo online, o escribinos por WhatsApp y te ayudamos a asegurarlo. Los mejores lotes se reservan primero, no te quedes afuera.",
    orden: 4,
  },
];

export async function GET(req: Request) {
  if (new URL(req.url).searchParams.get("t") !== TOKEN) return NextResponse.json({ ok: false }, { status: 404 });
  const supabase = await getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "sin admin" }, { status: 500 });
  const resultado: Record<string, number> = {};
  for (const c of CAMBIOS) {
    const { data, error } = await supabase
      .from("faqs")
      .update({ pregunta: c.pregunta, respuesta: c.respuesta, orden: c.orden })
      .in("pregunta", [...c.viejas, c.pregunta])
      .select("id");
    resultado[c.pregunta] = error ? -1 : (data?.length ?? 0);
  }
  return NextResponse.json({ ok: true, resultado });
}
