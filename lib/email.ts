const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Matu Lotes <no-reply@matulotes.app>";
const EMAIL_TO = process.env.EMAIL_TO ?? "denunziopropiedades@gmail.com";

const FIRMA_HTML = `
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-family: sans-serif; color: #333;">
    <p style="margin: 0; font-weight: bold;">DE NUNZIO DESARROLLOS</p>
    <p style="margin: 4px 0 0 10px;">Matías De Nunzio</p>
    <p style="margin: 0 0 0 10px; color: #666;">Desarrollos Urbanos</p>
    <p style="margin: 2px 0 0 10px; color: #666;">Tel: 11-2742-4512</p>
    <p style="margin: 2px 0 0 10px; color: #666;">Oficina: 11-6136-5523</p>
  </div>
`;

export const NOTA_COORDINACION_VISITA_HTML = `
  <div style="margin-top: 20px; padding: 16px; border: 1px solid #f5c6cb; background: #fff5f5; border-radius: 8px;">
    <p style="margin: 0 0 8px; font-weight: bold; color: #c0392b;">Importante &ndash; Coordinación de visitas</p>
    <p style="margin: 0 0 8px; color: #333;">
      Las visitas se coordinan exclusivamente con cita previa y
      <b style="color: #c0392b;">deben ser tomadas con responsabilidad</b>, ya que serán realizadas por
      Desarrollos Urbanos o por un integrante de su equipo, quienes destinan tiempo y recursos para
      brindar un asesoramiento personalizado.
    </p>
    <p style="margin: 0 0 8px; color: #333;">
      En caso de no poder asistir,
      <b style="color: #c0392b;">solicitamos comunicar la cancelación o reprogramación con la mayor anticipación posible</b>.
      Esto nos permite reorganizar la agenda y ofrecer ese horario a otros interesados.
    </p>
    <p style="margin: 0; color: #333;">
      Agradecemos su compromiso, puntualidad y comprensión. Será un placer acompañarlo en la búsqueda de la mejor
      opción para su inversión.
    </p>
  </div>
`;

export const NOTA_RESERVA_LOTE_HTML = `
  <div style="margin-top: 20px; padding: 16px; border: 1px solid #f0d999; background: #fffbeb; border-radius: 8px;">
    <p style="margin: 0 0 8px; font-weight: bold; color: #96741f;">Importante &ndash; Reserva del lote</p>
    <p style="margin: 0 0 8px; color: #333;">
      Recordá que, una vez realizada la visita y si el lote cumple con tus expectativas y decidís avanzar con la
      operación, podrás reservarlo mediante una <b style="color: #96741f;">seña de $200.000</b>.
    </p>
    <p style="margin: 0 0 8px; color: #333;">
      Este importe <b style="color: #96741f;">se imputa íntegramente al precio de la operación</b>, es decir,
      <b style="color: #96741f;">se descuenta del monto que debas abonar al concretar la compra</b>, por lo que no
      representa un costo adicional.
    </p>
    <p style="margin: 0 0 8px; color: #333;">
      La reserva permite asegurar la disponibilidad del lote seleccionado y dar inicio al proceso de compra con la
      correspondiente documentación.
    </p>
    <p style="margin: 0; color: #333;">
      Ante cualquier consulta, nuestro equipo estará a disposición para brindarte asesoramiento personalizado.
    </p>
  </div>
`;

function conFirma(html: string) {
  return `${html}${FIRMA_HTML}`;
}

/** Arma el HTML del mail de bienvenida que recibe el cliente al reservar 1, 2 o 3 lotes juntos. */
export function armarMailBienvenidaReserva(datos: {
  nombre: string;
  proyectoNombre: string;
  manzana: string;
  lotes: { numero: string; superficieM2: number }[];
  linkPago?: string | null;
  planFinanciacion?: { anticipoUsd: number; cuotas: number; valorCuotaUsd: number } | null;
}) {
  const filasLotes = datos.lotes
    .map((l) => `<li>Lote ${l.numero} &ndash; ${l.superficieM2} m²</li>`)
    .join("");

  const formaPagoHtml = datos.planFinanciacion
    ? `<p style="margin: 0 0 4px; color: #333;"><b>FORMA DE PAGO:</b> Financiado — anticipo USD ${datos.planFinanciacion.anticipoUsd}, en ${datos.planFinanciacion.cuotas} cuotas de USD ${datos.planFinanciacion.valorCuotaUsd} c/u. Nuestro equipo se va a comunicar para acordar la fecha de la primera cuota.</p>`
    : `<p style="margin: 0 0 4px; color: #333;"><b>FORMA DE PAGO:</b> Contado</p>`;

  const botonPago = datos.linkPago
    ? `
    <div style="margin: 20px 0; padding: 16px; border: 1px solid #b3e0f2; background: #f0faff; border-radius: 8px; text-align: center;">
      <p style="margin: 0 0 12px; color: #333;">
        Si te resulta más fácil, podés abonar la seña del terreno directamente desde acá:
      </p>
      <a
        href="${datos.linkPago}"
        style="display: inline-block; background: #009EE3; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 999px; font-weight: bold; font-family: sans-serif;"
      >
        Abona desde acá la seña del terreno
      </a>
    </div>`
    : "";

  return `
    <h2>¡Gracias por tu reserva, ${datos.nombre}!</h2>
    <p style="color: #333;">Recibimos tu operación correctamente. Este es el detalle:</p>
    <p style="margin: 16px 0 4px; color: #333;"><b>PROYECTO:</b> ${datos.proyectoNombre}</p>
    <p style="margin: 0 0 4px; color: #333;"><b>MANZANA:</b> ${datos.manzana}</p>
    <p style="margin: 0 0 4px; color: #333;"><b>LOTES RESERVADOS:</b></p>
    <ul style="color: #333;">${filasLotes}</ul>
    <p style="margin: 4px 0; color: #333;"><b>TOTAL DE LOTES:</b> ${datos.lotes.length}</p>
    <p style="margin: 16px 0 4px; color: #333;"><b>Estado de la operación:</b> Reserva recibida</p>
    ${formaPagoHtml}
    ${botonPago}
    <p style="margin: 16px 0 4px; color: #333;"><b>Próximos pasos:</b></p>
    <p style="margin: 0; color: #333;">
      Nuestro equipo se va a comunicar con vos para coordinar la seña y el resto de la
      documentación. Ante cualquier consulta, respondé este correo o escribinos por WhatsApp.
    </p>
  `;
}

/** Arma el HTML del recordatorio que se manda 7 días antes de que venza una cuota. */
export function armarMailRecordatorioCuota(datos: {
  nombre: string;
  proyectoNombre: string;
  numeroCuota: number;
  totalCuotas: number;
  montoUsd: number;
  vencimiento: string;
}) {
  const fecha = new Date(`${datos.vencimiento}T12:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return `
    <h2>Tu cuota está por vencer</h2>
    <p style="color: #333;">Hola ${datos.nombre}, te recordamos que en una semana vence tu próxima cuota de ${datos.proyectoNombre}:</p>
    <div style="margin: 20px 0; padding: 16px; border: 1px solid #f0d999; background: #fffbeb; border-radius: 8px;">
      <p style="margin: 0 0 4px; color: #333;"><b>Cuota:</b> ${datos.numeroCuota} de ${datos.totalCuotas}</p>
      <p style="margin: 0 0 4px; color: #333;"><b>Monto:</b> USD ${datos.montoUsd}</p>
      <p style="margin: 0; color: #333;"><b>Vencimiento:</b> ${fecha}</p>
    </div>
    <p style="margin: 0; color: #333;">
      Ante cualquier consulta sobre cómo abonarla, respondé este correo o escribinos por WhatsApp.
    </p>
  `;
}

/** Arma el HTML del mail que confirma al cliente que le registramos el pago de una cuota. */
export function armarMailConfirmacionCuotaPagada(datos: {
  nombre: string;
  proyectoNombre: string;
  numeroCuota: number;
  totalCuotas: number;
  montoPagadoUsd: number;
  cuotasRestantes: number;
  proximoVencimiento: string | null;
}) {
  const proximo = datos.proximoVencimiento
    ? new Date(`${datos.proximoVencimiento}T12:00:00`).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : null;

  return `
    <h2>¡Recibimos tu pago, ${datos.nombre}!</h2>
    <p style="color: #333;">Te confirmamos que registramos el pago de tu cuota de ${datos.proyectoNombre}:</p>
    <div style="margin: 20px 0; padding: 16px; border: 1px solid #b3e0c6; background: #f0faf3; border-radius: 8px;">
      <p style="margin: 0 0 4px; color: #333;"><b>Cuota:</b> ${datos.numeroCuota} de ${datos.totalCuotas}</p>
      <p style="margin: 0; color: #333;"><b>Monto pagado:</b> USD ${datos.montoPagadoUsd}</p>
    </div>
    ${
      datos.cuotasRestantes > 0
        ? `<p style="margin: 0; color: #333;">
             Te quedan <b>${datos.cuotasRestantes}</b> cuota${datos.cuotasRestantes === 1 ? "" : "s"} más.
             ${proximo ? `La próxima vence el <b>${proximo}</b>.` : ""}
           </p>`
        : `<p style="margin: 0; color: #333;"><b>¡Esta era tu última cuota! Terminaste de abonar tu plan de financiación.</b></p>`
    }
    <p style="margin: 16px 0 0; color: #333;">
      Ante cualquier consulta, respondé este correo o escribinos por WhatsApp.
    </p>
  `;
}

/** Arma el HTML del mail que avisa al cliente el día/horario de la firma en escribanía,
 * con los datos de la escribanía del proyecto y la documentación requerida. */
export function armarMailFirmaEscribania(datos: {
  nombre: string;
  proyectoNombre: string;
  manzana: string;
  lotes: { numero: string; superficieM2: number }[];
  fecha: string;
  horario: string;
  escribaniaNombre: string | null;
  escribaniaDireccion: string | null;
  escribaniaMapsUrl: string | null;
  escribaniaInstrucciones: string | null;
  documentosRequeridos: string[];
}) {
  const filasLotes = datos.lotes
    .map((l) => `<li>Lote ${l.numero}${l.superficieM2 ? ` &ndash; ${l.superficieM2} m²` : ""}</li>`)
    .join("");
  const fechaFormateada = new Date(`${datos.fecha}T00:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const filasDocumentos = [...datos.documentosRequeridos, "DNI físico (obligatorio)"]
    .map((d) => `<li>${d}</li>`)
    .join("");

  return `
    <h2>¡Ya tenemos día y horario para tu firma, ${datos.nombre}!</h2>
    <p style="margin: 16px 0 4px; color: #333;"><b>PROYECTO:</b> ${datos.proyectoNombre}</p>
    <p style="margin: 0 0 4px; color: #333;"><b>MANZANA:</b> ${datos.manzana}</p>
    <p style="margin: 0 0 4px; color: #333;"><b>LOTE/S:</b></p>
    <ul style="color: #333;">${filasLotes}</ul>
    <p style="margin: 16px 0 4px; color: #333;"><b>FECHA DE FIRMA:</b> ${fechaFormateada}</p>
    <p style="margin: 0 0 4px; color: #333;"><b>HORARIO:</b> ${datos.horario} hs</p>
    ${
      datos.escribaniaNombre || datos.escribaniaDireccion
        ? `<p style="margin: 16px 0 4px; color: #333;"><b>ESCRIBANÍA:</b> ${datos.escribaniaNombre ?? ""}</p>
           ${datos.escribaniaDireccion ? `<p style="margin: 0 0 4px; color: #333;"><b>DIRECCIÓN:</b> ${datos.escribaniaDireccion}</p>` : ""}
           ${
             datos.escribaniaMapsUrl
               ? `<p style="margin: 0 0 4px;"><a href="${datos.escribaniaMapsUrl}" target="_blank" rel="noopener noreferrer" style="color: #16a34a; font-weight: 600;">Ver ubicación en Google Maps</a></p>`
               : ""
           }`
        : ""
    }
    <div style="margin-top: 20px; padding: 16px; border: 1px solid #f5c6cb; background: #fff5f5; border-radius: 8px;">
      <p style="margin: 0 0 8px; font-weight: bold; color: #c0392b;">Documentación a presentar</p>
      <ul style="margin: 0; color: #333;">${filasDocumentos}</ul>
      <p style="margin: 8px 0 0; color: #c0392b;"><b>Es imprescindible presentarte con tu DNI físico</b> — no se aceptan copias ni versiones digitales.</p>
    </div>
    ${datos.escribaniaInstrucciones ? `<p style="margin: 16px 0 4px; color: #333;">${datos.escribaniaInstrucciones}</p>` : ""}
    <p style="margin: 16px 0 0; color: #333;">Ante cualquier consulta, respondé este correo o escribinos por WhatsApp.</p>
  `;
}

export type AdjuntoEmail = { filename: string; content: string };

async function enviar(to: string, subject: string, html: string, adjuntos?: AdjuntoEmail[]) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      reply_to: EMAIL_TO,
      subject,
      html: conFirma(html),
      ...(adjuntos && adjuntos.length > 0 ? { attachments: adjuntos } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend error (${res.status}): ${text}`);
  }

  return { skipped: false as const };
}

/**
 * Envía un email de notificación al dueño del sitio (EMAIL_TO) vía Resend
 * (https://resend.com). Si RESEND_API_KEY no está configurada, no hace nada
 * (modo demo/dev).
 */
export async function sendNotificationEmail(subject: string, html: string) {
  if (!RESEND_API_KEY) return { skipped: true as const };
  return enviar(EMAIL_TO, subject, html);
}

/**
 * Envía un email a un destinatario puntual (ej. un cliente), a diferencia de
 * sendNotificationEmail que siempre le avisa al dueño del sitio.
 * Si RESEND_API_KEY no está configurada, no hace nada (modo demo/dev).
 */
export async function sendEmail(to: string, subject: string, html: string, adjuntos?: AdjuntoEmail[]) {
  if (!RESEND_API_KEY || !to) return { skipped: true as const };
  return enviar(to, subject, html, adjuntos);
}
