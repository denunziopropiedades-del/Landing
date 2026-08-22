import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

export const SENA_ARS = 200000;

export { PAGO_ONLINE_RESERVA_HABILITADO } from "@/lib/feature-flags";

export function isMercadoPagoConfigured() {
  return Boolean(ACCESS_TOKEN);
}

function getConfig() {
  if (!ACCESS_TOKEN) return null;
  return new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
}

export function getPreferenceClient() {
  const config = getConfig();
  return config ? new Preference(config) : null;
}

export function getPaymentClient() {
  const config = getConfig();
  return config ? new Payment(config) : null;
}

/** Crea el link de pago de la seña (Checkout Pro) para un lead. Devuelve null
 * si Mercado Pago no está configurado o si falla la creación de la preferencia. */
export async function crearLinkPagoSena(datos: {
  leadId: string;
  nombre: string;
  email: string;
  lotesNombres: string[];
}): Promise<string | null> {
  const preference = getPreferenceClient();
  if (!preference) return null;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const titulo =
    datos.lotesNombres.length === 1
      ? `Seña reserva ${datos.lotesNombres[0]}`
      : `Seña reserva de ${datos.lotesNombres.length} lotes`;

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            id: datos.leadId,
            title: titulo,
            quantity: 1,
            unit_price: SENA_ARS,
            currency_id: "ARS",
          },
        ],
        payer: { name: datos.nombre, email: datos.email },
        back_urls: {
          success: `${siteUrl}/reserva/exito`,
          failure: `${siteUrl}/reserva/error`,
          pending: `${siteUrl}/reserva/pendiente`,
        },
        auto_return: "approved",
        external_reference: datos.leadId,
        notification_url: `${siteUrl}/api/mercadopago/webhook`,
      },
    });
    return result.init_point ?? null;
  } catch (err) {
    console.error("No se pudo crear el link de pago de la seña", err);
    return null;
  }
}
