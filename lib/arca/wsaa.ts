import type { SupabaseClient } from "@supabase/supabase-js";
import { firmarCms } from "@/lib/arca/cms";
import { credenciales, URLS, type EntornoArca } from "@/lib/arca/config";
import { desescapar, fault, postSoap, tag } from "@/lib/arca/soap";

export type Ticket = { token: string; sign: string };

const SERVICIO = "wsfe";

function isoAr(d: Date): string {
  // ARCA pide la hora con zona: la armamos en hora argentina (UTC-3, sin horario de verano).
  const ar = new Date(d.getTime() - 3 * 3600 * 1000);
  return ar.toISOString().replace(/\.\d{3}Z$/, "-03:00");
}

/**
 * Ticket de acceso (token + sign) del WSAA para wsfe. Dura ~12 h: se guarda en la
 * tabla arca_tokens para reutilizarlo entre funciones serverless (ARCA no da otro
 * mientras el anterior siga vigente).
 */
export async function obtenerTicket(a: SupabaseClient, entorno: EntornoArca, cuit: string): Promise<Ticket> {
  const clave = `${entorno}:${SERVICIO}:${cuit}`;
  const { data: guardado } = await a.from("arca_tokens").select("token, sign, expira_en").eq("clave", clave).maybeSingle();
  if (guardado && new Date(guardado.expira_en as string).getTime() - Date.now() > 10 * 60 * 1000) {
    return { token: guardado.token as string, sign: guardado.sign as string };
  }

  const { cert, key } = credenciales(entorno);
  if (!cert || !key) {
    throw new Error(
      entorno === "produccion"
        ? "Faltan las variables ARCA_CERT y/o ARCA_KEY en Vercel."
        : "Faltan las variables ARCA_CERT_HOMO y/o ARCA_KEY en Vercel."
    );
  }

  const ahora = new Date();
  const tra = `<?xml version="1.0" encoding="UTF-8"?><loginTicketRequest version="1.0"><header><uniqueId>${Math.floor(ahora.getTime() / 1000)}</uniqueId><generationTime>${isoAr(new Date(ahora.getTime() - 10 * 60 * 1000))}</generationTime><expirationTime>${isoAr(new Date(ahora.getTime() + 10 * 60 * 1000))}</expirationTime></header><service>${SERVICIO}</service></loginTicketRequest>`;
  const cms = firmarCms(tra, cert, key);

  const sobre = `<?xml version="1.0" encoding="UTF-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.sua.dvadac.desein.afip.gov"><soapenv:Header/><soapenv:Body><wsaa:loginCms><wsaa:in0>${cms}</wsaa:in0></wsaa:loginCms></soapenv:Body></soapenv:Envelope>`;
  const resp = await postSoap(URLS[entorno].wsaa, "", sobre);
  const error = fault(resp);
  if (error) {
    if (/ya posee un TA valido/i.test(error)) {
      throw new Error(
        "ARCA dice que ya hay un ticket de acceso vigente que no quedó guardado. Esperá unos minutos (hasta 12 h como máximo) y volvé a intentar."
      );
    }
    throw new Error(`Login en ARCA (WSAA): ${error}`);
  }

  const ret = tag(resp, "loginCmsReturn");
  if (!ret) throw new Error("Respuesta inesperada del login de ARCA (WSAA).");
  const ta = desescapar(ret);
  const token = tag(ta, "token");
  const sign = tag(ta, "sign");
  const vence = tag(ta, "expirationTime");
  if (!token || !sign) throw new Error("El login de ARCA no devolvió token/sign.");

  await a.from("arca_tokens").upsert({
    clave,
    token,
    sign,
    expira_en: vence ? new Date(vence).toISOString() : new Date(Date.now() + 11 * 3600 * 1000).toISOString(),
  });
  return { token, sign };
}
