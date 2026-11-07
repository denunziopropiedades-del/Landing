import { INSTITUCION, NOMBRE_TIPO, fechaAr, type DocEmitido } from "@/lib/docs-clientes/core";

/** Pie institucional que va en todos los mails del módulo. */
/** Línea institucional (la firma con nombre y teléfonos la agrega el envío de mails). */
export const PIE_INSTITUCIONAL = `
  <p style="margin: 20px 0 0; color: #777; font-size: 12px;">
    ${INSTITUCION.nombre} · ${INSTITUCION.titulo} · ${INSTITUCION.matricula} · WhatsApp ${INSTITUCION.whatsapp.join(" / ")}<br>
    ${INSTITUCION.leyenda}
  </p>`;

const boton = (href: string, texto: string, color = "#16294f") =>
  `<a href="${href}" style="display: inline-block; padding: 12px 22px; border-radius: 999px; background: ${color}; color: #ffffff; font-weight: bold; text-decoration: none;">${texto}</a>`;

const escapar = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Mail con la documentación y el enlace privado. */
export function mailEnvioDocumento(d: DocEmitido, link: string, mensaje: string | null, venceLink: string) {
  const asunto = `Documentación de su operación inmobiliaria – ${INSTITUCION.nombre}`;
  const html = `
  <div style="font-family: sans-serif; color: #333; max-width: 580px;">
    <p style="margin: 0 0 12px;">Estimado/a ${escapar(d.clienteNombre)}:</p>
    <p style="margin: 0 0 12px;">Desde ${INSTITUCION.nombre} le compartimos la documentación correspondiente a su ${
      d.tipo === "reserva" ? "reserva inmobiliaria" : "certificado de libre deuda"
    } <b>N.º ${d.numero}</b>.</p>
    ${mensaje ? `<p style="margin: 0 0 12px; white-space: pre-line;">${escapar(mensaje)}</p>` : ""}
    <p style="margin: 0 0 16px;">Puede ingresar al siguiente enlace privado para ${
      d.tipo === "reserva" && d.aceptaHabilitada
        ? "consultar las condiciones, visualizar el documento, descargar su copia y aceptar o rechazar la reserva"
        : "visualizar el documento y descargar su copia"
    }:</p>
    <p style="margin: 0 0 8px;">${boton(link, "Ver mi documentación")}</p>
    <p style="margin: 0 0 16px; font-size: 12px; color: #777;">El enlace es personal: no lo reenvíe. Vence el ${fechaAr(venceLink)}.</p>
    <p style="margin: 0 0 12px;">El documento cuenta con un sistema de verificación de autenticidad (código QR).</p>
    <p style="margin: 0;">Ante cualquier consulta, estamos a su disposición.</p>
    ${PIE_INSTITUCIONAL}
  </div>`;
  return { asunto, html };
}

/** Mensaje de WhatsApp para el envío manual asistido. */
export function mensajeWhatsappDocumento(d: DocEmitido, link: string) {
  const que = d.tipo === "reserva" ? "su reserva inmobiliaria" : "su certificado de libre deuda";
  return `Estimado/a ${d.clienteNombre}:

Desde ${INSTITUCION.nombre} le compartimos la documentación correspondiente a ${que} N.º ${d.numero}.

Puede ingresar al siguiente enlace para ${
    d.tipo === "reserva" ? "consultar las condiciones, visualizar el documento y descargar su copia" : "visualizar el documento y descargar su copia"
  }:

🔗 ${link}

El documento cuenta con un sistema de verificación de autenticidad y seguridad.

Ante cualquier consulta, estamos a su disposición.

${INSTITUCION.nombre}
${INSTITUCION.titulo}
${INSTITUCION.matricula}

WhatsApp: ${INSTITUCION.whatsapp.join(" / ")}

${INSTITUCION.leyenda}`;
}

/** Código de un solo uso para aceptar/rechazar. */
export function mailCodigo(d: DocEmitido, codigo: string) {
  return {
    asunto: `Su código de verificación: ${codigo} – Reserva ${d.numero}`,
    html: `
    <div style="font-family: sans-serif; color: #333; max-width: 520px;">
      <p style="margin: 0 0 12px;">Estimado/a ${escapar(d.clienteNombre)}:</p>
      <p style="margin: 0 0 12px;">Para confirmar su decisión sobre la reserva <b>N.º ${d.numero}</b>, ingrese este código:</p>
      <p style="margin: 0 0 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f1b2d;">${codigo}</p>
      <p style="margin: 0 0 12px; color: #666; font-size: 13px;">Vence en 10 minutos y sirve una sola vez. Si usted no lo pidió, ignore este mensaje.</p>
      ${PIE_INSTITUCIONAL}
    </div>`,
  };
}

/** Constancia al cliente de lo que decidió. */
export function mailConstancia(
  d: DocEmitido,
  decision: "aceptado" | "rechazado",
  datos: { fecha: string; hash: string | null; motivo: string | null; link: string | null }
) {
  const acepto = decision === "aceptado";
  return {
    asunto: `Constancia: reserva ${d.numero} ${acepto ? "aceptada" : "rechazada"}`,
    html: `
    <div style="font-family: sans-serif; color: #333; max-width: 580px;">
      <div style="padding: 14px 18px; border-radius: 10px; background: ${acepto ? "#16a34a" : "#dc2626"}; color: #fff;">
        <p style="margin: 0; font-size: 18px; font-weight: bold;">Reserva ${acepto ? "aceptada" : "rechazada"}</p>
      </div>
      <p style="margin: 16px 0 12px;">Estimado/a ${escapar(d.clienteNombre)}, dejamos constancia de su decisión:</p>
      <table style="border-collapse: collapse; width: 100%; border: 1px solid #e3e7ef; font-size: 14px;">
        <tr><td style="padding: 8px 12px; color: #666;">Documento</td><td style="padding: 8px 12px;"><b>${NOMBRE_TIPO[d.tipo]} N.º ${d.numero}</b> (versión ${d.version})</td></tr>
        <tr><td style="padding: 8px 12px; color: #666;">Decisión</td><td style="padding: 8px 12px;"><b>${acepto ? "Aceptó las condiciones" : "Rechazó las condiciones"}</b></td></tr>
        <tr><td style="padding: 8px 12px; color: #666;">Fecha y hora</td><td style="padding: 8px 12px;">${fechaAr(datos.fecha, true)} hs</td></tr>
        <tr><td style="padding: 8px 12px; color: #666;">Verificado con</td><td style="padding: 8px 12px;">Código enviado a su email</td></tr>
        ${datos.motivo ? `<tr><td style="padding: 8px 12px; color: #666;">Motivo</td><td style="padding: 8px 12px;">${escapar(datos.motivo)}</td></tr>` : ""}
        ${datos.hash ? `<tr><td style="padding: 8px 12px; color: #666;">Huella del documento</td><td style="padding: 8px 12px; font-family: monospace; font-size: 11px; word-break: break-all;">${datos.hash}</td></tr>` : ""}
      </table>
      ${datos.link ? `<p style="margin: 16px 0 0;">${boton(datos.link, "Ver mi documentación")}</p>` : ""}
      <p style="margin: 16px 0 0; font-size: 12px; color: #777;">Esta constancia electrónica registra su decisión; no constituye firma digital.</p>
      ${PIE_INSTITUCIONAL}
    </div>`,
  };
}

/** Aviso interno (a la inmobiliaria). */
export function mailAvisoInterno(titulo: string, d: DocEmitido, extra = "") {
  return {
    asunto: `${titulo}: ${NOMBRE_TIPO[d.tipo]} ${d.numero} — ${d.clienteNombre}`,
    html: `<h2 style="margin:0 0 8px">${titulo}</h2>
      <p><b>${NOMBRE_TIPO[d.tipo]} N.º ${d.numero}</b><br>Cliente: ${escapar(d.clienteNombre)}${d.clienteEmail ? ` (${d.clienteEmail})` : ""}</p>
      ${extra}
      <p style="color:#666;font-size:13px">Lo ves en el panel: Reservas y certificados.</p>`,
  };
}

/** Aviso al cliente de que su reserva está por vencer. */
export function mailReservaPorVencer(d: DocEmitido, link: string | null) {
  return {
    asunto: `Su reserva ${d.numero} vence el ${fechaAr(d.venceEn)}`,
    html: `
    <div style="font-family: sans-serif; color: #333; max-width: 580px;">
      <p style="margin: 0 0 12px;">Estimado/a ${escapar(d.clienteNombre)}:</p>
      <p style="margin: 0 0 12px;">Le recordamos que su reserva inmobiliaria <b>N.º ${d.numero}</b> tiene validez hasta el <b>${fechaAr(d.venceEn)}</b>.</p>
      ${link ? `<p style="margin: 0 0 12px;">${boton(link, "Ver mi reserva")}</p>` : ""}
      <p style="margin: 0;">Ante cualquier consulta, estamos a su disposición.</p>
      ${PIE_INSTITUCIONAL}
    </div>`,
  };
}
