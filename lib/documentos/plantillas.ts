/**
 * Modelos de contratos y escritos.
 *
 * Un modelo es texto común con campos entre llaves dobles: {{Nombre del perito}}.
 * - Tipo opcional después de "|": {{Día de la pericia|fecha}}, {{Hora|hora}}, {{Monto|numero}}, {{Observaciones|texto largo}}.
 * - Valor por defecto opcional después de "=": {{Localidad=Ciudad Autónoma de Buenos Aires}}.
 * - **negrita** marca texto en negrita en el PDF.
 * - Una línea que contiene solo [FIRMA] ubica el bloque de firma y sello.
 * Sin dependencias de servidor: se usa también en el navegador.
 */

export type TipoCampo = "texto" | "fecha" | "hora" | "numero" | "porcentaje" | "texto largo";

export type Campo = { clave: string; etiqueta: string; tipo: TipoCampo; porDefecto: string };

export type Modelo = {
  id: string;
  nombre: string;
  categoria: string;
  cuerpo: string;
  incorporado?: boolean; // modelos que vienen con el sistema
};

const RE_CAMPO = /\{\{\s*([^{}|=]+?)\s*(?:\|\s*([^{}=]+?)\s*)?(?:=\s*([^{}]*?)\s*)?\}\}/g;

const TIPOS: TipoCampo[] = ["texto", "fecha", "hora", "numero", "porcentaje", "texto largo"];

/** Campos de un modelo, en orden de aparición y sin repetir. */
export function camposDe(cuerpo: string): Campo[] {
  const vistos = new Map<string, Campo>();
  for (const m of cuerpo.matchAll(RE_CAMPO)) {
    const etiqueta = m[1].trim();
    const clave = etiqueta.toLowerCase();
    const tipoRaw = (m[2] ?? "texto").trim().toLowerCase().replace(/^porcentaje.*/, "porcentaje") as TipoCampo;
    const tipo = TIPOS.includes(tipoRaw) ? tipoRaw : "texto";
    const previo = vistos.get(clave);
    if (!previo) vistos.set(clave, { clave, etiqueta, tipo, porDefecto: (m[3] ?? "").trim() });
    else if (tipo === "porcentaje" && previo.tipo === "numero") previo.tipo = "porcentaje";
    else if (!previo.porDefecto && m[3]) previo.porDefecto = m[3].trim();
  }
  return [...vistos.values()];
}

const UNIDADES = ["cero", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once", "doce", "trece", "catorce", "quince", "dieciséis", "diecisiete", "dieciocho", "diecinueve", "veinte", "veintiuno", "veintidós", "veintitrés", "veinticuatro", "veinticinco", "veintiséis", "veintisiete", "veintiocho", "veintinueve"];
const DECENAS = ["", "", "", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];

/** Enteros de 0 a 100 en letras ("cuarenta", "treinta y cinco", "cien"). */
export function numeroEnLetras(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  if (n === 100) return "cien";
  if (n < 30) return UNIDADES[n];
  const d = Math.floor(n / 10);
  const u = n % 10;
  return u ? `${DECENAS[d]} y ${UNIDADES[u]}` : DECENAS[d];
}

const NUM_LETRAS = `(?:${[...UNIDADES, ...DECENAS.filter(Boolean), "cien"].sort((a, b) => b.length - a.length).join("|")})(?:\\s+y\\s+(?:${UNIDADES.slice(1, 10).join("|")}))?`;
// "CUARENTA POR CIENTO (40%)", "40%" y repartos tipo "60/40" (que sumen 100).
const RE_PORCENTAJE = new RegExp(
  `\\b(${NUM_LETRAS})\\s+por\\s+ciento\\s*\\(\\s*(\\d+(?:[.,]\\d+)?)\\s*%\\s*\\)` +
    `|(\\d+(?:[.,]\\d+)?)\\s*%` +
    `|\\b(\\d{1,2})\\s*\\/\\s*(\\d{1,2})\\b`,
  "gi",
);

const esReparto = (a: string, b: string) => Number(a) + Number(b) === 100;

/** Cuántos porcentajes escritos a mano hay (fuera de campos ya marcados). */
export function contarPorcentajes(cuerpo: string) {
  const sinCampos = cuerpo.replace(RE_CAMPO, "");
  let n = 0;
  for (const m of sinCampos.matchAll(RE_PORCENTAJE)) if (m[1] || m[3] || (m[4] && esReparto(m[4], m[5]))) n++;
  return n;
}

/**
 * Convierte los porcentajes del texto en campos, para cambiarlos en cada contrato.
 * Cada valor distinto es un campo con el valor original por defecto, nombrado según la
 * parte que aparece cerca ("Porcentaje de El comercializador"); los de cláusulas penales,
 * multas o intereses van aparte. La versión en letras se escribe sola:
 * 35 → "TREINTA Y CINCO POR CIENTO (35%)".
 */
export function convertirPorcentajes(cuerpo: string): string {
  type Ocurrencia = { inicio: number; fin: number; valores: string[]; formato: string[]; penal: boolean };
  const protegidos = [...cuerpo.matchAll(RE_CAMPO)].map((m) => [m.index!, m.index! + m[0].length]);
  const dentro = (i: number) => protegidos.some(([a, b]) => i >= a && i < b);
  const ocurrencias: Ocurrencia[] = [];
  for (const m of cuerpo.matchAll(RE_PORCENTAJE)) {
    const inicio = m.index!;
    if (dentro(inicio)) continue;
    const fin = inicio + m[0].length;
    // Cláusula penal, multas o intereses: se buscan desde el último título o punto y aparte.
    const parrafo = cuerpo.slice(Math.max(0, cuerpo.lastIndexOf("\n\n", inicio - 1)), inicio);
    const tituloPrevio = cuerpo.slice(Math.max(0, inicio - 600), inicio).split("\n").filter((l) => l.trim()).slice(-2).join(" ");
    const penal = /penal|multa|inter[eé]s|mora\b/i.test(parrafo + " " + tituloPrevio);
    if (m[1]) {
      const minus = m[1] === m[1].toLowerCase();
      ocurrencias.push({ inicio, fin, valores: [m[2]], formato: [minus ? "porcentaje en minusculas" : "porcentaje en letras"], penal });
    } else if (m[3]) ocurrencias.push({ inicio, fin, valores: [m[3]], formato: ["porcentaje"], penal });
    else if (m[4] && esReparto(m[4], m[5])) ocurrencias.push({ inicio, fin, valores: [m[4], m[5]], formato: ["numero", "numero"], penal: false });
  }
  if (!ocurrencias.length) return cuerpo;

  // Votos: qué parte ("EL POSEEDOR", "LA LOCATARIA"…) aparece más cerca de cada valor.
  const RE_PARTE = /\b(EL|LA|LOS|LAS)\s+([A-ZÁÉÍÓÚÑ]{4,}(?:\s+[A-ZÁÉÍÓÚÑ]{4,})?)/g;
  const votos = new Map<string, Map<string, number>>();
  for (const o of ocurrencias) {
    if (o.valores.length > 1 || o.penal) continue;
    const v = o.valores[0];
    const antes = cuerpo.slice(Math.max(0, o.inicio - 120), o.inicio);
    const despues = cuerpo.slice(o.fin, o.fin + 60);
    const cerca: { parte: string; dist: number }[] = [];
    for (const p of despues.matchAll(RE_PARTE)) cerca.push({ parte: `${p[1]} ${p[2]}`, dist: p.index! });
    for (const p of antes.matchAll(RE_PARTE)) cerca.push({ parte: `${p[1]} ${p[2]}`, dist: antes.length - p.index! - p[0].length + 10 });
    const elegida = cerca.filter((c) => c.parte !== "LAS PARTES").sort((a, b) => a.dist - b.dist)[0];
    if (!elegida) continue;
    const mapa = votos.get(v) ?? new Map<string, number>();
    mapa.set(elegida.parte, (mapa.get(elegida.parte) ?? 0) + 1);
    votos.set(v, mapa);
  }

  const usados = new Set(camposDe(cuerpo).map((c) => c.clave));
  const nombres = new Map<string, string>();
  const asignar = (clave: string, nombre: string) => {
    let final = nombre;
    let k = 2;
    while (usados.has(final.toLowerCase())) final = `${nombre} ${k++}`;
    usados.add(final.toLowerCase());
    nombres.set(clave, final);
  };
  let n = 0;
  for (const o of ocurrencias) {
    o.valores.forEach((v) => {
      const clave = o.penal ? `penal|${v}` : v;
      if (nombres.has(clave)) return;
      if (o.penal) return asignar(clave, "Porcentaje de la cláusula penal");
      const mapa = votos.get(v);
      const parte = mapa ? [...mapa.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
      const quien = parte ? limpiarEtiqueta(parte).replace(/^El /, "el ").replace(/^La /, "la ").replace(/^Los /, "los ").replace(/^Las /, "las ") : "";
      asignar(clave, quien ? `Porcentaje ${quien.startsWith("el ") ? `del ${quien.slice(3)}` : `de ${quien}`}` : `Porcentaje ${++n}`);
    });
  }

  let res = cuerpo;
  for (let j = ocurrencias.length - 1; j >= 0; j--) {
    const o = ocurrencias[j];
    const partes = o.valores.map((v, i) => `{{${nombres.get(o.penal ? `penal|${v}` : v)}|${o.formato[i]}=${v.replace(",", ".")}}}`);
    res = res.slice(0, o.inicio) + partes.join("/") + res.slice(o.fin);
  }
  return res;
}

/** Espacios para completar que trae un Word: "________" o "XXXX". */
export const RE_BLANCO = /_{4,}|X{3,}/g;

const VACIAS = new Set(["de", "del", "la", "las", "el", "los", "a", "al", "en", "y", "e", "o", "con", "por", "para", "nº", "n°", "no", "nro", "nro.", "n.º", "sr.", "sra.", "sr./sra.", "señor", "señora"]);
const SIN_CAMPO = /^firma/i; // las líneas de firma quedan para firmar a mano

function limpiarEtiqueta(t: string) {
  const s = t.replace(/\*\*/g, "").replace(/[“”"«»]/g, "").replace(/\s+/g, " ").replace(/[:\-–—,.;]+$/, "").trim();
  if (!s) return "";
  const conMayus = s.length <= 4 && s === s.toUpperCase() ? s : s === s.toUpperCase() ? s.toLowerCase() : s;
  return (conMayus.charAt(0).toUpperCase() + conMayus.slice(1)).replace(/\bn([º°])/g, "N$1");
}

function etiquetaDesde(antes: string, despues: string): string {
  const seg = antes.replace(/\*\*/g, "").split(/[,.;()]/).pop()!.trim();
  // Formato "Ubicación: ____" → se usa la frase completa.
  if (/:\s*$/.test(seg) && seg.split(/\s+/).length <= 6) return limpiarEtiqueta(seg);
  const palabras = seg.split(/\s+/).filter(Boolean);
  while (palabras.length && VACIAS.has(palabras[palabras.length - 1].toLowerCase())) palabras.pop();
  if (palabras.length) {
    const ult = palabras[palabras.length - 1];
    // Un nombre en mayúsculas antes del espacio ("OBDULIO ____") pide el nombre completo.
    if (ult.length > 4 && ult === ult.toUpperCase() && /\p{Lu}/u.test(ult)) return "Nombre completo";
    return limpiarEtiqueta(ult);
  }
  const sig = despues.replace(/\*\*/g, "").split(/\s+/).find((w) => w && !VACIAS.has(w.toLowerCase()));
  return sig ? limpiarEtiqueta(sig.replace(/[^\p{L}\p{N}]/gu, "")) : "";
}

function esTitulo(linea: string, soloNegritas: boolean) {
  if (soloNegritas && !/^\s*\*\*.*\*\*\s*$/.test(linea)) return false;
  const t = linea.replace(/\*\*/g, "").trim();
  return t.length >= 3 && t.length <= 70 && /\p{Lu}/u.test(t) && t === t.toUpperCase() && !/_{3,}|X{3,}/.test(t);
}

/** Cuántos espacios en blanco convertibles hay (sin contar líneas de firma). */
export function contarBlancos(cuerpo: string) {
  let n = 0;
  for (const linea of cuerpo.split("\n")) {
    for (const m of linea.matchAll(RE_BLANCO)) if (!SIN_CAMPO.test(linea.slice(0, m.index).replace(/\*\*/g, "").trim())) n++;
  }
  return n;
}

/**
 * Convierte los espacios en blanco ("______", "XXXX") en campos con nombre, tomado del
 * texto que los rodea: "Ubicación: ____" → {{Ubicación}}, "DNI Nº ____" → {{DNI}}.
 * Si un nombre se repite, se le agrega el título de su sección: {{DNI — El poseedor}},
 * {{Ubicación — Inmueble Nº 2}}. Las líneas de "Firma" no se tocan.
 */
export function convertirBlancos(cuerpo: string): string {
  const lineas = cuerpo.split("\n");
  type Hueco = { linea: number; inicio: number; fin: number; base: string; seccion: string };
  const huecos: Hueco[] = [];
  let seccion = "";
  let n = camposDe(cuerpo).length;
  // Si el Word trae títulos en negrita, solo esos marcan secciones (un nombre en mayúsculas no).
  const soloNegritas = lineas.some((l) => /^\s*\*\*.*\*\*\s*$/.test(l));
  lineas.forEach((linea, i) => {
    if (esTitulo(linea, soloNegritas)) seccion = limpiarEtiqueta(linea);
    let previo = 0;
    for (const m of linea.matchAll(RE_BLANCO)) {
      const inicio = m.index!;
      const fin = inicio + m[0].length;
      const antes = linea.slice(previo, inicio);
      previo = fin;
      if (SIN_CAMPO.test(linea.slice(0, inicio).replace(/\*\*/g, "").trim())) continue;
      const despues = linea.slice(fin).split(RE_BLANCO)[0];
      const e = etiquetaDesde(antes, despues);
      const base = e === "Días" ? "Día" : e || `Dato ${++n}`;
      huecos.push({ linea: i, inicio, fin, base, seccion });
    }
  });
  const usadas = new Set(camposDe(cuerpo).map((c) => c.clave));
  const veces = new Map<string, number>();
  for (const h of huecos) veces.set(h.base.toLowerCase(), (veces.get(h.base.toLowerCase()) ?? 0) + 1);
  const nombres = huecos.map((h) => {
    let nombre = (veces.get(h.base.toLowerCase()) ?? 0) > 1 && h.seccion ? `${h.base} — ${h.seccion}` : h.base;
    let k = 2;
    const raiz = nombre;
    while (usadas.has(nombre.toLowerCase())) nombre = `${raiz} ${k++}`;
    usadas.add(nombre.toLowerCase());
    return nombre.replace(/[{}|=]/g, "");
  });
  // Reemplazar de atrás para adelante para no correr las posiciones.
  for (let j = huecos.length - 1; j >= 0; j--) {
    const h = huecos[j];
    const l = lineas[h.linea];
    lineas[h.linea] = `${l.slice(0, h.inicio)}{{${nombres[j]}}}${l.slice(h.fin)}`;
  }
  return lineas.join("\n");
}

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** Formatea el valor según el tipo de campo (fecha "2026-08-07" → "7 de agosto de 2026"). */
export function formatearValor(tipo: TipoCampo | string, valor: string): string {
  const v = (valor ?? "").trim();
  if (!v) return v;
  if (String(tipo).startsWith("porcentaje")) {
    const n = Number(v.replace("%", "").replace(",", ".").trim());
    if (!Number.isFinite(n)) return v;
    const num = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
    const letras = tipo === "porcentaje" ? null : numeroEnLetras(n);
    if (!letras) return `${num}%`;
    const frase = `${letras} por ciento`;
    return `${tipo === "porcentaje en minusculas" ? frase : frase.toUpperCase()} (${num}%)`;
  }
  if (tipo === "fecha") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (m) return `${Number(m[3])} de ${MESES[Number(m[2]) - 1]} de ${m[1]}`;
  }
  if (tipo === "numero") {
    const n = Number(v.replace(/\./g, "").replace(",", "."));
    if (Number.isFinite(n)) return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(n);
  }
  return v;
}

/** Reemplaza los campos por sus valores. Los vacíos quedan como una línea para completar a mano. */
export function completar(cuerpo: string, valores: Record<string, string>): string {
  const campos = new Map(camposDe(cuerpo).map((c) => [c.clave, c]));
  return cuerpo.replace(RE_CAMPO, (_t, etiqueta: string, tipoOcurrencia?: string) => {
    const c = campos.get(etiqueta.trim().toLowerCase());
    const valor = valores[etiqueta.trim().toLowerCase()];
    if (!c) return "";
    const final = valor !== undefined && valor.trim() !== "" ? valor : c.porDefecto;
    return final ? formatearValor(tipoOcurrencia?.trim().toLowerCase() || c.tipo, final) : "________________";
  });
}

/** Nombre sugerido para el archivo PDF. */
export function nombreArchivo(modelo: string, valores: Record<string, string>) {
  const extra = Object.values(valores).find((v) => /\d{3,}/.test(v ?? "")) ?? "";
  const base = `${modelo}${extra ? ` ${extra}` : ""}`
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `${base || "documento"}.pdf`;
}

/** Datos del sistema que completan solos los campos con nombres conocidos. */
export type DatosSistema = Record<string, string>;

/** Busca, para cada campo, un dato del sistema cuyo nombre coincida (sin tildes ni mayúsculas). */
export function sugerencias(campos: Campo[], datos: DatosSistema): Record<string, string> {
  const norm = (t: string) =>
    t
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const indice = new Map(Object.entries(datos).map(([k, v]) => [norm(k), v]));
  const res: Record<string, string> = {};
  for (const c of campos) {
    const v = indice.get(norm(c.etiqueta));
    if (v) res[c.clave] = v;
  }
  return res;
}

export const MODELOS_INCORPORADOS: Modelo[] = [
  {
    id: "aceptacion-cargo-judicial",
    nombre: "Aceptación de cargo judicial",
    categoria: "Escritos judiciales",
    incorporado: true,
    cuerpo: `**SR. JUEZ:**

El/la que suscribe, {{Nombre del perito}}, designado/a Perito {{Especialidad del perito}}, con Matrícula N.º {{Matrícula}}, con domicilio constituido en {{Domicilio constituido}} de la {{Localidad del domicilio=Ciudad Autónoma de Buenos Aires}}, en autos caratulados “{{Actor}} C/ {{Demandado}} S/ {{Objeto del juicio=DAÑOS Y PERJUICIOS}}” (Exp. N.º {{Número de expediente}}), a V.S. respetuosamente digo:

Que se **ACEPTA EL CARGO Y SE CITA** al Sr./Sra. {{Persona citada}}, para el inicio de la pericia.

Día: {{Día de la pericia|fecha}}
Hora: {{Hora de la pericia|hora}} horas
Domicilio: {{Domicilio de la pericia}}
Teléfono: {{Teléfono de contacto}}. Confirmar asistencia.

Es cuanto tengo que informar.

**PROVEER DE CONFORMIDAD**

**SERÁ JUSTICIA**

[FIRMA]`,
  },
];
