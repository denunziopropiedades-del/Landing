import { faqs, lotes, siteTextos } from "@/lib/data";
import { formatUsd } from "@/lib/utils";

export type TemaChat = {
  keywords: string[];
  respuesta: string;
};

const temasBase: TemaChat[] = faqs.map((f) => ({
  keywords: f.pregunta
    .toLowerCase()
    .replace(/[¿?]/g, "")
    .split(" ")
    .filter((w) => w.length > 3),
  respuesta: f.respuesta,
}));

const temasExtra: TemaChat[] = [
  {
    keywords: ["precio", "precios", "cuesta", "cuanto", "vale", "valor"],
    respuesta: `Los lotes van desde ${formatUsd(lotes[0].precioUsd)} (300 m²) hasta ${formatUsd(
      lotes[lotes.length - 1].precioUsd
    )} (900 m²). Contamos con financiación propia. ¿Querés que te pase el detalle por WhatsApp?`,
  },
  {
    keywords: ["ubicacion", "donde", "direccion", "zona"],
    respuesta:
      "Ayres de Guernica está en Guernica, Buenos Aires, con excelente acceso a Ruta 210, Presidente Perón, Canning, San Vicente y CABA.",
  },
  {
    keywords: ["contacto", "telefono", "whatsapp", "hablar", "asesor", "vendedor"],
    respuesta: `Podés escribirnos por WhatsApp o al mail ${siteTextos.email}, con gusto te atendemos.`,
  },
  {
    keywords: ["hola", "buenas", "buenos", "dias", "tardes", "noches"],
    respuesta: "¡Hola! Soy el asistente virtual de Ayres de Guernica. ¿En qué te puedo ayudar hoy?",
  },
];

export const temasChat: TemaChat[] = [...temasBase, ...temasExtra];

export const RESPUESTA_DEFAULT =
  "No tengo una respuesta puntual para eso, pero nuestro equipo comercial sí. ¿Te gustaría que te contactemos por WhatsApp?";

/** Selección de respuesta por coincidencia de palabras clave (motor simple, sin dependencias externas). */
export function responderChat(mensaje: string): string {
  const texto = mensaje.toLowerCase();
  let mejor: { tema: TemaChat; score: number } | null = null;

  for (const tema of temasChat) {
    const score = tema.keywords.filter((k) => texto.includes(k)).length;
    if (score > 0 && (!mejor || score > mejor.score)) {
      mejor = { tema, score };
    }
  }

  return mejor?.tema.respuesta ?? RESPUESTA_DEFAULT;
}
