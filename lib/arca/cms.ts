import { createHash, createSign } from "node:crypto";

/**
 * Firma CMS/PKCS#7 (SignedData, contenido adjunto) para el login del WSAA de ARCA.
 * Equivale a `openssl cms -sign -nodetach -outform DER`, sin dependencias externas:
 * arma el DER a mano con el certificado y la clave privada del emisor.
 */

// ---------- DER mínimo ----------

function largo(n: number): Buffer {
  if (n < 0x80) return Buffer.from([n]);
  const bytes: number[] = [];
  while (n > 0) {
    bytes.unshift(n & 0xff);
    n >>= 8;
  }
  return Buffer.from([0x80 | bytes.length, ...bytes]);
}

function tlv(tag: number, contenido: Buffer): Buffer {
  return Buffer.concat([Buffer.from([tag]), largo(contenido.length), contenido]);
}

const seq = (...partes: Buffer[]) => tlv(0x30, Buffer.concat(partes));
const set = (...partes: Buffer[]) => tlv(0x31, Buffer.concat(partes));
const octetos = (b: Buffer) => tlv(0x04, b);
const nulo = () => Buffer.from([0x05, 0x00]);
const explicito = (n: number, contenido: Buffer) => tlv(0xa0 + n, contenido);

function entero(n: number): Buffer {
  return tlv(0x02, Buffer.from([n]));
}

function oid(texto: string): Buffer {
  const partes = texto.split(".").map(Number);
  const bytes: number[] = [40 * partes[0] + partes[1]];
  for (const p of partes.slice(2)) {
    const grupo: number[] = [p & 0x7f];
    let v = Math.floor(p / 128);
    while (v > 0) {
      grupo.unshift((v & 0x7f) | 0x80);
      v = Math.floor(v / 128);
    }
    bytes.push(...grupo);
  }
  return tlv(0x06, Buffer.from(bytes));
}

function utcTime(d: Date): Buffer {
  const p = (n: number) => String(n).padStart(2, "0");
  const s = `${p(d.getUTCFullYear() % 100)}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`;
  return tlv(0x17, Buffer.from(s, "ascii"));
}

/** Lee un TLV DER en `pos`: devuelve dónde empieza el contenido y dónde termina el elemento. */
function leer(buf: Buffer, pos: number) {
  const tag = buf[pos];
  let len = buf[pos + 1];
  let inicio = pos + 2;
  if (len & 0x80) {
    const n = len & 0x7f;
    len = 0;
    for (let i = 0; i < n; i++) len = len * 256 + buf[pos + 2 + i];
    inicio += n;
  }
  return { tag, inicio, fin: inicio + len };
}

/** Del certificado X.509 (DER) saca el emisor (Name) y el número de serie, crudos. */
function emisorYSerie(certDer: Buffer) {
  const cert = leer(certDer, 0);
  const tbs = leer(certDer, cert.inicio);
  let pos = tbs.inicio;
  let el = leer(certDer, pos);
  if (el.tag === 0xa0) {
    pos = el.fin; // versión [0]
    el = leer(certDer, pos);
  }
  const serie = certDer.subarray(pos, el.fin); // INTEGER completo
  pos = el.fin;
  el = leer(certDer, pos); // algoritmo de firma
  pos = el.fin;
  el = leer(certDer, pos); // issuer
  const emisor = certDer.subarray(pos, el.fin);
  return { emisor, serie };
}

export function pemADer(pem: string): Buffer {
  const b64 = pem
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
  return Buffer.from(b64, "base64");
}

const OID_DATA = "1.2.840.113549.1.7.1";
const OID_SIGNED_DATA = "1.2.840.113549.1.7.2";
const OID_SHA256 = "2.16.840.1.101.3.4.2.1";
const OID_RSA = "1.2.840.113549.1.1.1";
const OID_CONTENT_TYPE = "1.2.840.113549.1.9.3";
const OID_MESSAGE_DIGEST = "1.2.840.113549.1.9.4";
const OID_SIGNING_TIME = "1.2.840.113549.1.9.5";

/** Firma `contenido` y devuelve el CMS en base64, listo para `loginCms`. */
export function firmarCms(contenido: string, certPem: string, keyPem: string, ahora = new Date()): string {
  const datos = Buffer.from(contenido, "utf8");
  const certDer = pemADer(certPem);
  const { emisor, serie } = emisorYSerie(certDer);

  const algSha256 = seq(oid(OID_SHA256), nulo());
  const digest = createHash("sha256").update(datos).digest();

  const atributos = [
    seq(oid(OID_CONTENT_TYPE), set(oid(OID_DATA))),
    seq(oid(OID_SIGNING_TIME), set(utcTime(ahora))),
    seq(oid(OID_MESSAGE_DIGEST), set(octetos(digest))),
  ];
  // Se firma el SET de atributos (tag 0x31); en el SignerInfo va como [0] IMPLICIT (tag 0xa0).
  const atributosSet = set(...atributos);
  const firma = createSign("RSA-SHA256").update(atributosSet).sign(keyPem);
  const atributosImplicitos = Buffer.concat([Buffer.from([0xa0]), atributosSet.subarray(1)]);

  const signerInfo = seq(
    entero(1),
    seq(emisor, serie),
    algSha256,
    atributosImplicitos,
    seq(oid(OID_RSA), nulo()),
    octetos(firma)
  );

  const signedData = seq(
    entero(1),
    set(algSha256),
    seq(oid(OID_DATA), explicito(0, octetos(datos))),
    explicito(0, certDer),
    set(signerInfo)
  );

  return seq(oid(OID_SIGNED_DATA), explicito(0, signedData)).toString("base64");
}
