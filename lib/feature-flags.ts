/** Interruptor único para el pago online de la seña en la reserva de lotes.
 * En false, la reserva solo se coordina por WhatsApp (hasta nuevo aviso) —
 * no se muestra el botón de pago ni se manda el link por mail. Para
 * reactivarlo, volver a poner esto en true.
 *
 * Vive en su propio archivo (sin más imports) para poder usarse tanto desde
 * componentes de cliente como desde el servidor sin arrastrar el SDK de
 * Mercado Pago al bundle del navegador. */
export const PAGO_ONLINE_RESERVA_HABILITADO = true;
