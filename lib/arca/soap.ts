import https from "node:https";

/**
 * Llamada SOAP a los servidores de ARCA. Se usa `https` de Node (no fetch) porque
 * los servidores de ARCA negocian claves Diffie-Hellman cortas que OpenSSL 3 rechaza
 * por defecto ("dh key too small"): bajamos el nivel de seguridad solo para estas llamadas.
 */
export function postSoap(url: string, soapAction: string, cuerpo: string, timeoutMs = 25000): Promise<string> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method: "POST",
        hostname: u.hostname,
        path: u.pathname + u.search,
        port: 443,
        ciphers: "DEFAULT@SECLEVEL=1",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: soapAction,
          "Content-Length": Buffer.byteLength(cuerpo),
        },
        timeout: timeoutMs,
      },
      (res) => {
        const partes: Buffer[] = [];
        res.on("data", (c) => partes.push(c));
        res.on("end", () => {
          const texto = Buffer.concat(partes).toString("utf8");
          if ((res.statusCode ?? 500) >= 400 && !texto.includes("Fault")) {
            reject(new Error(`ARCA respondió HTTP ${res.statusCode}`));
          } else resolve(texto);
        });
      }
    );
    req.on("timeout", () => req.destroy(new Error("ARCA no respondió a tiempo")));
    req.on("error", reject);
    req.write(cuerpo);
    req.end();
  });
}

/** Contenido del primer <tag>…</tag> (sin namespace), o null. */
export function tag(xml: string, nombre: string): string | null {
  const m = xml.match(new RegExp(`<(?:\\w+:)?${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nombre}>`));
  return m ? m[1] : null;
}

/** Todos los bloques <tag>…</tag>. */
export function tags(xml: string, nombre: string): string[] {
  const re = new RegExp(`<(?:\\w+:)?${nombre}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${nombre}>`, "g");
  return [...xml.matchAll(re)].map((m) => m[1]);
}

export function desescapar(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Mensaje de un SOAP Fault, si lo hay. */
export function fault(xml: string): string | null {
  const f = tag(xml, "Fault");
  if (!f) return null;
  return desescapar(tag(f, "faultstring") ?? "Error SOAP de ARCA");
}
