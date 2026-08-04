import { MercadoPagoConfig, Preference } from "mercadopago";

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

export function isMercadoPagoConfigured() {
  return Boolean(ACCESS_TOKEN);
}

export function getPreferenceClient() {
  if (!ACCESS_TOKEN) return null;
  const client = new MercadoPagoConfig({ accessToken: ACCESS_TOKEN });
  return new Preference(client);
}
