import { URLS, type EntornoArca } from "@/lib/arca/config";
import { escapar, fault, postSoap, tag, tags } from "@/lib/arca/soap";
import type { Ticket } from "@/lib/arca/wsaa";

const NS = "http://ar.gov.afip.dif.FEV1/";

export type Auth = Ticket & { cuit: string; entorno: EntornoArca };

export type MensajeArca = { codigo: string; mensaje: string };

function auth(a: Auth) {
  return `<Auth><Token>${a.token}</Token><Sign>${a.sign}</Sign><Cuit>${a.cuit}</Cuit></Auth>`;
}

async function llamar(a: Auth, metodo: string, cuerpo: string): Promise<string> {
  const sobre = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><${metodo} xmlns="${NS}">${auth(a)}${cuerpo}</${metodo}></soap:Body></soap:Envelope>`;
  const resp = await postSoap(URLS[a.entorno].wsfe, `${NS}${metodo}`, sobre);
  const f = fault(resp);
  if (f) throw new Error(`ARCA (${metodo}): ${f}`);
  return resp;
}

function mensajes(xml: string | null, contenedor: string, item: string): MensajeArca[] {
  if (!xml) return [];
  const bloque = tag(xml, contenedor);
  if (!bloque) return [];
  return tags(bloque, item).map((b) => ({ codigo: tag(b, "Code") ?? "", mensaje: tag(b, "Msg") ?? "" }));
}

function errores(xml: string) {
  return mensajes(xml, "Errors", "Err");
}

function lanzarSiError(xml: string, que: string) {
  const errs = errores(xml);
  if (errs.length) throw new Error(`${que}: ${errs.map((e) => `[${e.codigo}] ${e.mensaje}`).join(" · ")}`);
}

export async function ultimoAutorizado(a: Auth, ptoVta: number, tipo: number): Promise<number> {
  const xml = await llamar(a, "FECompUltimoAutorizado", `<PtoVta>${ptoVta}</PtoVta><CbteTipo>${tipo}</CbteTipo>`);
  lanzarSiError(xml, "Último comprobante");
  return Number(tag(xml, "CbteNro") ?? "0");
}

export async function puntosDeVenta(a: Auth): Promise<{ numero: number; tipo: string; bloqueado: boolean; baja: string | null }[]> {
  const xml = await llamar(a, "FEParamGetPtosVenta", "");
  // En homologación suele devolver el error 602 "sin resultados": no es grave.
  return tags(xml, "PtoVenta").map((b) => ({
    numero: Number(tag(b, "Nro")),
    tipo: tag(b, "EmisionTipo") ?? "",
    bloqueado: (tag(b, "Bloqueado") ?? "N") === "S",
    baja: tag(b, "FchBaja") && tag(b, "FchBaja") !== "NULL" ? tag(b, "FchBaja") : null,
  }));
}

export async function cotizacion(a: Auth, moneda = "DOL"): Promise<{ cotizacion: number; fecha: string | null }> {
  const xml = await llamar(a, "FEParamGetCotizacion", `<MonId>${moneda}</MonId>`);
  lanzarSiError(xml, "Cotización");
  const valor = Number(tag(xml, "MonCotiz"));
  if (!Number.isFinite(valor) || valor <= 0) throw new Error("ARCA no devolvió la cotización del dólar.");
  return { cotizacion: valor, fecha: tag(xml, "FchCotiz") };
}

export type SolicitudCae = {
  ptoVta: number;
  tipo: number; // 11 Factura C, 13 Nota de Crédito C
  numero: number;
  concepto: number; // 1 productos, 2 servicios, 3 ambos
  docTipo: number; // 80 CUIT, 86 CUIL, 96 DNI, 99 sin identificar
  docNro: string;
  condicionIvaReceptor: number;
  fecha: string; // YYYYMMDD
  total: number;
  servDesde?: string;
  servHasta?: string;
  vtoPago?: string;
  moneda: "PES" | "DOL";
  cotizacion: number;
  cancelaMismaMoneda: boolean;
  asociado?: { tipo: number; ptoVta: number; numero: number; cuit: string; fecha: string };
};

export type RespuestaCae = {
  resultado: "A" | "R" | "P";
  cae: string | null;
  caeVto: string | null;
  observaciones: MensajeArca[];
  errores: MensajeArca[];
  xml: string;
};

const imp = (n: number) => n.toFixed(2);

export function armarDetalle(s: SolicitudCae): string {
  const servicios = s.concepto !== 1;
  return [
    `<FeCAEReq><FeCabReq><CantReg>1</CantReg><PtoVta>${s.ptoVta}</PtoVta><CbteTipo>${s.tipo}</CbteTipo></FeCabReq>`,
    `<FeDetReq><FECAEDetRequest>`,
    `<Concepto>${s.concepto}</Concepto><DocTipo>${s.docTipo}</DocTipo><DocNro>${escapar(s.docNro)}</DocNro>`,
    `<CbteDesde>${s.numero}</CbteDesde><CbteHasta>${s.numero}</CbteHasta><CbteFch>${s.fecha}</CbteFch>`,
    // Monotributo (comprobantes C): todo va como neto, sin IVA discriminado.
    `<ImpTotal>${imp(s.total)}</ImpTotal><ImpTotConc>0.00</ImpTotConc><ImpNeto>${imp(s.total)}</ImpNeto>`,
    `<ImpOpEx>0.00</ImpOpEx><ImpTrib>0.00</ImpTrib><ImpIVA>0.00</ImpIVA>`,
    servicios ? `<FchServDesde>${s.servDesde}</FchServDesde><FchServHasta>${s.servHasta}</FchServHasta><FchVtoPago>${s.vtoPago}</FchVtoPago>` : "",
    `<MonId>${s.moneda}</MonId><MonCotiz>${s.moneda === "PES" ? "1" : s.cotizacion.toFixed(6)}</MonCotiz>`,
    s.moneda !== "PES" ? `<CanMisMonExt>${s.cancelaMismaMoneda ? "S" : "N"}</CanMisMonExt>` : "",
    `<CondicionIVAReceptorId>${s.condicionIvaReceptor}</CondicionIVAReceptorId>`,
    s.asociado
      ? `<CbtesAsoc><CbteAsoc><Tipo>${s.asociado.tipo}</Tipo><PtoVta>${s.asociado.ptoVta}</PtoVta><Nro>${s.asociado.numero}</Nro><Cuit>${s.asociado.cuit}</Cuit><CbteFch>${s.asociado.fecha}</CbteFch></CbteAsoc></CbtesAsoc>`
      : "",
    `</FECAEDetRequest></FeDetReq></FeCAEReq>`,
  ].join("");
}

export async function solicitarCae(a: Auth, s: SolicitudCae): Promise<RespuestaCae> {
  const xml = await llamar(a, "FECAESolicitar", armarDetalle(s));
  const det = tag(xml, "FECAEDetResponse") ?? "";
  const resultado = (tag(det, "Resultado") ?? tag(xml, "Resultado") ?? "R") as "A" | "R" | "P";
  const cae = tag(det, "CAE");
  const vto = tag(det, "CAEFchVto");
  return {
    resultado,
    cae: cae && cae.trim() ? cae.trim() : null,
    caeVto: vto && vto.trim() ? vto.trim() : null,
    observaciones: mensajes(det, "Observaciones", "Obs"),
    errores: errores(xml),
    xml,
  };
}

/** Consulta un comprobante ya emitido (para no duplicar si se cortó la conexión). */
export async function consultarComprobante(
  a: Auth,
  ptoVta: number,
  tipo: number,
  numero: number
): Promise<{ cae: string; caeVto: string; total: number; docNro: string } | null> {
  const xml = await llamar(
    a,
    "FECompConsultar",
    `<FeCompConsReq><CbteTipo>${tipo}</CbteTipo><CbteNro>${numero}</CbteNro><PtoVta>${ptoVta}</PtoVta></FeCompConsReq>`
  );
  const res = tag(xml, "ResultGet");
  if (!res) return null;
  const cae = tag(res, "CodAutorizacion");
  if (!cae) return null;
  return {
    cae,
    caeVto: tag(res, "FchVto") ?? "",
    total: Number(tag(res, "ImpTotal") ?? 0),
    docNro: tag(res, "DocNro") ?? "",
  };
}
