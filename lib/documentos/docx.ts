/**
 * Extrae el texto de un archivo .docx (Word) en el navegador, sin librerías:
 * lee el ZIP, descomprime word/document.xml y arma los párrafos.
 * Las negritas de Word se conservan como **texto**.
 */
export async function textoDeDocx(archivo: File): Promise<string> {
  const buf = new Uint8Array(await archivo.arrayBuffer());
  const xml = await leerEntradaZip(buf, "word/document.xml");
  if (!xml) throw new Error("No se encontró el contenido del documento. ¿Es un archivo .docx?");
  const dom = new DOMParser().parseFromString(xml, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const parrafos: string[] = [];
  for (const p of Array.from(dom.getElementsByTagNameNS(W, "p"))) {
    let linea = "";
    for (const r of Array.from(p.getElementsByTagNameNS(W, "r"))) {
      const negrita = r.getElementsByTagNameNS(W, "b").length > 0;
      let t = "";
      for (const nodo of Array.from(r.childNodes)) {
        const el = nodo as Element;
        if (el.localName === "t") t += el.textContent ?? "";
        else if (el.localName === "tab") t += "\t";
        else if (el.localName === "br") t += "\n";
      }
      if (!t) continue;
      linea += negrita && t.trim() ? `**${t.trim()}**${/\s$/.test(t) ? " " : ""}` : t;
    }
    parrafos.push(linea.replace(/\*\*\*\*/g, ""));
  }
  return parrafos
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function leerEntradaZip(buf: Uint8Array, nombre: string): Promise<string | null> {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Fin del directorio central
  let fin = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fin = i;
      break;
    }
  }
  if (fin < 0) return null;
  const total = dv.getUint16(fin + 10, true);
  let pos = dv.getUint32(fin + 16, true);
  const dec = new TextDecoder();
  for (let k = 0; k < total; k++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) return null;
    const metodo = dv.getUint16(pos + 10, true);
    const tamComp = dv.getUint32(pos + 20, true);
    const largoNombre = dv.getUint16(pos + 28, true);
    const largoExtra = dv.getUint16(pos + 30, true);
    const largoComent = dv.getUint16(pos + 32, true);
    const offLocal = dv.getUint32(pos + 42, true);
    const n = dec.decode(buf.subarray(pos + 46, pos + 46 + largoNombre));
    if (n === nombre) {
      const lnLocal = dv.getUint16(offLocal + 26, true);
      const lxLocal = dv.getUint16(offLocal + 28, true);
      const ini = offLocal + 30 + lnLocal + lxLocal;
      const datos = buf.slice(ini, ini + tamComp);
      if (metodo === 0) return dec.decode(datos);
      if (metodo === 8) {
        const ds = new DecompressionStream("deflate-raw");
        const salida = await new Response(new Blob([datos]).stream().pipeThrough(ds)).arrayBuffer();
        return dec.decode(salida);
      }
      return null;
    }
    pos += 46 + largoNombre + largoExtra + largoComent;
  }
  return null;
}
