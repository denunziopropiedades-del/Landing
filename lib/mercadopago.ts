import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

const ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

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
