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

/** Espacios para completar que trae un Word: "___", "XXXX", "…", "……", "...", "........" o ". . . .". */
export const RE_BLANCO = /_{3,}|X{3,}|…+[.…]*|\.{3,}[.…]*|\.(?:[ \t]\.){3,}|(?<=:[ ]*)\t+/g; // la última: línea punteada de Word hecha con tabulación ("Nombre:⇥")

const VACIAS = new Set(["de", "del", "la", "las", "el", "los", "a", "al", "en", "y", "e", "o", "con", "por", "para", "nº", "n°", "no", "nro", "nro.", "n.º", "sr.", "sra.", "sr./sra.", "señor", "señora"]);
const SIN_CAMPO = /^firma/i; // las líneas de firma quedan para firmar a mano

function limpiarEtiqueta(t: string) {
  const s = t
    .replace(/\*\*/g, "")
    .replace(/[“”"«»]/g, "")
    .replace(/\/(as?|os?|es)\b/g, "") // "Juez/a" → "Juez"
    .replace(/\s+/g, " ")
    .replace(/^[\/\s]+/, "")
    .replace(/[:\-–—,.;\/]+$/, "")
    .trim();
  if (!s) return "";
  const conMayus = s.length <= 4 && s === s.toUpperCase() ? s : s === s.toUpperCase() ? s.toLowerCase() : s;
  return (conMayus.charAt(0).toUpperCase() + conMayus.slice(1)).replace(/\bn([º°])/g, "N$1");
}

function etiquetaDesde(antes: string, despues: string): string {
  // "Sr. ……", "la Sra. ……", "Dr. ……" → el nombre de esa persona.
  if (/\b(sr|sra|srta|sres|dr|dra)\.?(\s*\/\s*\w+\.?)?\s*$/i.test(antes)) return "Nombre";
  // "$ ……", "USD ……" → un monto.
  if (/(\$|u\$s|usd|ars)\s*$/i.test(antes.trim())) return "Monto";
  const seg = antes.replace(/\*\*/g, "").replace(/[“”"«»]/g, " ").split(/[,.;()]/).pop()!.trim();
  // Formato "Ubicación: ____" → se usa la frase completa.
  if (/:\s*$/.test(seg) && seg.split(/\s+/).length <= 6) return limpiarEtiqueta(seg);
  const palabras = seg.split(/\s+/).filter(Boolean);
  while (palabras.length && VACIAS.has(palabras[palabras.length - 1].toLowerCase())) palabras.pop();
  if (palabras.length) {
    const ult = palabras[palabras.length - 1];
    // Siglas ("CUIT/CUIL", "DNI") quedan tal cual.
    if (/\//.test(ult) || /^(CUIT|CUIL|DNI|CBU|CVU|IVA)$/i.test(ult)) return ult.toUpperCase().replace(/[:,.;]+$/, "");
    // Un nombre en mayúsculas antes del espacio ("OBDULIO ____") pide el nombre completo.
    if (ult.length > 4 && ult === ult.toUpperCase() && /\p{Lu}/u.test(ult)) return "Nombre completo";
    // Dos palabras cuando aclaran ("domicilio constituido", "autos caratulados").
    const penult = palabras[palabras.length - 2];
    if (penult && !VACIAS.has(penult.toLowerCase()) && /^\p{Ll}/u.test(ult) && /^\p{L}+$/u.test(penult)) return limpiarEtiqueta(`${penult} ${ult}`);
    return limpiarEtiqueta(ult);
  }
  const sig = despues.replace(/\*\*/g, "").split(/\s+/).find((w) => w && !VACIAS.has(w.toLowerCase()));
  return sig ? limpiarEtiqueta(sig.replace(/[^\p{L}\p{N}]/gu, "")) : "";
}

function esTitulo(linea: string, soloNegritas: boolean) {
  if (soloNegritas && !/^\s*\*\*.*\*\*\s*$/.test(linea)) return false;
  const t = linea.replace(/\*\*/g, "").trim();
  return t.length >= 3 && t.length <= 70 && /\p{Lu}/u.test(t) && t === t.toUpperCase() && !/_{3,}|X{3,}|…|\.{3,}/.test(t);
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
      let e = etiquetaDesde(antes, despues);
      // "Nº ____/____": el segundo espacio sin texto antes es la continuación del anterior (ej. el año).
      const anterior = huecos[huecos.length - 1];
      if (!/\p{L}/u.test(antes) && anterior && anterior.linea === i) e = /expediente/i.test(anterior.base) ? "Año del expediente" : `${anterior.base} (2)`;
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
  {
    id: "colaboracion-comercializacion-posesion",
    nombre: "Contrato de colaboración — comercialización de inmuebles en posesión",
    categoria: "Contratos",
    incorporado: true,
    cuerpo: `**CONTRATO DE COLABORACIÓN PARA LA COMERCIALIZACIÓN Y DESARROLLO DE INMUEBLES EN POSESIÓN - AUTORIZACIÓN EXCLUSIVA DE COMERCIALIZACIÓN - DISTRIBUCIÓN DE RESULTADOS Y TRANSMISIÓN DE LA POSESIÓN**

Entre **MATÍAS JAVIER DE NUNZIO**, DNI Nº 32.917.792, con domicilio real en Pasaje 4 Golondrinas Mza 403 Lote 14, Localidad de Alejandro Korn, Partido de San Vicente, Prov. Bs. As., en adelante “EL COMERCIALIZADOR”, por una parte; y **{{Nombre del poseedor}}**, DNI Nº {{DNI del poseedor}}, con domicilio real en {{Domicilio del poseedor}}, Localidad de {{Localidad del poseedor}}, Partido de {{Partido del poseedor}}, Prov. {{Provincia del poseedor=Bs. As.}}, en adelante “EL POSEEDOR”, por la otra; conjuntamente denominados “LAS PARTES”, convienen celebrar el presente “CONTRATO DE COLABORACIÓN PARA LA COMERCIALIZACIÓN Y DESARROLLO DE INMUEBLES EN POSESIÓN”, sujeto a las siguientes condiciones y estipulaciones:

**PRIMERA. ANTECEDENTES. RECONOCIMIENTO DE LA SITUACIÓN POSESORIA**

1.1. EL POSEEDOR manifiesta, declara y reconoce ejercer, por sí y/o por la sucesión de actos posesorios que invoca, la posesión pública, pacífica, continua e ininterrumpida de los inmuebles que serán individualizados en el ANEXO I del presente instrumento, desde aproximadamente el mes de {{Mes de inicio de la posesión}} del año {{Año de inicio de la posesión}}, circunstancia que constituye un antecedente esencial tenido en consideración por LAS PARTES para la celebración del presente contrato.

1.2. LAS PARTES dejan expresamente establecido que el presente instrumento no importa transmisión, cesión ni constitución de derecho real alguno sobre los inmuebles, ni pretende sustituir los instrumentos que, en cada caso concreto, resulten necesarios para documentar la transmisión de derechos posesorios, la entrega de la posesión o cualquier otro acto jurídico que corresponda celebrar con los terceros adquirentes.

1.3. La referencia efectuada a la situación posesoria de EL POSEEDOR constituye un presupuesto contractual y económico del presente acuerdo y no podrá ser interpretada como declaración de dominio registral cuando éste no se encuentre acreditado.

**SEGUNDA. OBJETO**

2.1. Por el presente, EL POSEEDOR encomienda a EL COMERCIALIZADOR, quien acepta, la organización, desarrollo, promoción, publicidad, individualización, mensura, puesta en mercado y comercialización de los inmuebles y/o fracciones de terreno individualizados en el ANEXO I.

2.2. El objeto comprende todas aquellas actividades materiales, comerciales, técnicas y de gestión necesarias o convenientes para procurar la colocación de los inmuebles en el mercado y concretar operaciones con terceros interesados.

2.3. EL COMERCIALIZADOR actuará con autonomía organizativa y comercial, sin que ello implique relación laboral, sociedad, mandato general, representación jurídica permanente ni comunidad de bienes entre LAS PARTES.

**TERCERA. APORTE Y OBLIGACIONES DE EL POSEEDOR**

EL POSEEDOR aporta al emprendimiento objeto del presente contrato:

a) Sus derechos y acciones posesorias respecto de los inmuebles;

b) Los antecedentes, documentación e información que obren en su poder respecto de los mismos;

c) su disponibilidad para permitir la realización de las tareas técnicas necesarias;

d) Su autorización para la promoción y comercialización;

e) Su colaboración para la individualización y eventual subdivisión material de las fracciones;

f) Su obligación de concurrir y suscribir aquellos instrumentos que razonablemente resulten necesarios para perfeccionar las operaciones con terceros, siempre que éstos resulten compatibles con el presente contrato y con la situación jurídica de los inmuebles.

**CUARTA. OBLIGACIONES DE EL COMERCIALIZADOR**

EL COMERCIALIZADOR asumirá, entre otras, las siguientes obligaciones:

a) desarrollar la estrategia comercial;

b) realizar publicaciones y acciones de publicidad;

c) procurar y contactar potenciales adquirentes;

d) coordinar visitas y reuniones;

e) gestionar reservas, señas y propuestas de compra;

f) coordinar, cuando corresponda, las tareas de mensura e individualización de las fracciones;

g) contratar, cuando resulte necesario, profesionales, técnicos, agrimensores, gestores y demás auxiliares vinculados con la comercialización;

h) organizar la documentación comercial de las operaciones;

i) comunicar a EL POSEEDOR las operaciones concretadas y los pagos efectivamente percibidos;

j) desarrollar todas aquellas gestiones razonablemente necesarias para el cumplimiento del objeto contractual.

**QUINTA. AUTORIZACIÓN EXPRESA DE COMERCIALIZACIÓN**

EL POSEEDOR otorga por el presente a EL COMERCIALIZADOR autorización expresa, suficiente y exclusiva para la comercialización de los inmuebles comprendidos en el ANEXO I durante la vigencia del presente contrato.

La autorización comprende la facultad de:

a) publicar los inmuebles;

b) efectuar fotografías, videos y material publicitario;

c) colocar cartelería;

d) realizar campañas de publicidad;

e) exhibir los inmuebles a interesados;

f) recibir consultas y propuestas;

g) negociar condiciones comerciales dentro de los parámetros acordados;

h) gestionar reservas y propuestas;

i) coordinar las tareas técnicas necesarias para la individualización de las fracciones.

La presente autorización no comprende facultades para transmitir por sí el dominio ni para disponer jurídicamente de derechos que no le pertenecen, salvo autorización específica otorgada por EL POSEEDOR para un acto determinado.

**SEXTA. EXCLUSIVIDAD**

Durante la vigencia del presente contrato, EL POSEEDOR se obliga a no encomendar a terceros la comercialización de los inmuebles comprendidos en el ANEXO I ni desarrollar, por sí o por terceros, una actividad comercial paralela destinada a eludir la intervención de EL COMERCIALIZADOR.

La exclusividad comprende tanto las operaciones realizadas directamente como aquellas instrumentadas por medio de terceros, familiares, mandatarios, sociedades, intermediarios o personas interpuestas.

**SÉPTIMA. PARTICIPACIÓN ECONÓMICA. DISTRIBUCIÓN {{Porcentaje del poseedor|numero=60}}/{{Porcentaje del comercializador|numero=40}}**

Como contraprestación por el conjunto de obligaciones, actividades, inversiones, gestiones y riesgos asumidos por EL COMERCIALIZADOR, LAS PARTES acuerdan que EL COMERCIALIZADOR tendrá derecho al {{Porcentaje del comercializador|porcentaje en letras=40}} del producido económico correspondiente a cada operación, correspondiendo el {{Porcentaje del poseedor|porcentaje en letras=60}} restante a EL POSEEDOR.

La participación será determinada operación por operación y lote por lote, sin necesidad de aguardar la finalización total del proyecto ni la comercialización de la totalidad de los inmuebles.

El porcentaje del {{Porcentaje del comercializador|porcentaje en letras=40}} constituye la participación contractual de EL COMERCIALIZADOR en el resultado económico de cada operación, y no una mera comisión aislada.

**OCTAVA. DEVENGAMIENTO Y PAGO DE LA PARTICIPACIÓN**

El derecho económico de EL COMERCIALIZADOR se devengará respecto de cada operación conforme al porcentaje de participación establecido en el presente contrato, correspondiendo el {{Porcentaje del poseedor|porcentaje=60}} a EL POSEEDOR y el {{Porcentaje del comercializador|porcentaje=40}} a EL COMERCIALIZADOR.

Cuando la operación sea financiada por EL COMERCIALIZADOR, éste asumirá a su exclusivo cargo la financiación otorgada al adquirente, incluyendo la percepción de las cuotas y el riesgo propio de dicha financiación.

En tales supuestos, EL POSEEDOR percibirá su participación del {{Porcentaje del poseedor|porcentaje en minusculas=60}} sobre el precio de la operación en la forma y oportunidad que se hubiera pactado con EL COMERCIALIZADOR, mientras que éste percibirá su participación del {{Porcentaje del comercializador|porcentaje en minusculas=40}} conforme al esquema de financiación convenido con el adquirente.

Las reservas, señas, anticipos o cualquier otro importe entregado a cuenta de una operación serán imputados a la operación correspondiente y se distribuirán conforme al porcentaje de participación establecido, salvo pacto escrito en contrario.

La financiación otorgada por EL COMERCIALIZADOR al adquirente no modificará ni reducirá el porcentaje de participación correspondiente a EL POSEEDOR, ni generará para éste obligación alguna de financiar, garantizar, adelantar o asumir el riesgo de cobro de las cuotas otorgadas por EL COMERCIALIZADOR.

**NOVENA. PRECIO DE LAS OPERACIONES**

El precio de cada lote o fracción será determinado de común acuerdo entre LAS PARTES.

Ninguna reducción sustancial del precio previamente acordado podrá ser realizada unilateralmente por EL POSEEDOR cuando ello tenga por finalidad directa o indirecta afectar la participación económica de EL COMERCIALIZADOR.

En caso de que una operación incluya intereses, actualizaciones, financiación, compensaciones, permutas, entregas de bienes o cualquier otra contraprestación económica, LAS PARTES deberán determinar su valor a efectos de establecer la participación correspondiente.

**DÉCIMA. GASTOS DE COMERCIALIZACIÓN Y DESARROLLO**

Serán a cargo de EL COMERCIALIZADOR los gastos ordinarios vinculados con la actividad comercial que éste desarrolle, incluyendo publicidad, publicaciones, promoción, difusión y demás erogaciones directamente relacionadas con la comercialización.

Asimismo, EL COMERCIALIZADOR podrá asumir los gastos necesarios para mensuras, tareas técnicas e individualización de las fracciones, cuando así lo considere conveniente para el desarrollo del emprendimiento.

Ello no implicará que EL COMERCIALIZADOR asuma obligaciones tributarias, cargas, deudas, pasivos, reclamos de terceros o gastos derivados de hechos jurídicos anteriores al presente contrato que correspondan exclusivamente a EL POSEEDOR.

**DÉCIMA PRIMERA. MENSURA, INDIVIDUALIZACIÓN Y TAREAS TÉCNICAS**

EL POSEEDOR autoriza expresamente a EL COMERCIALIZADOR a gestionar ante agrimensores, organismos públicos, profesionales, técnicos y demás autoridades competentes las tareas necesarias para determinar, medir, individualizar y, cuando jurídicamente resulte posible, subdividir las fracciones destinadas a comercialización.

Toda subdivisión formal deberá ajustarse a la normativa administrativa, catastral y urbanística aplicable.

La autorización conferida por esta cláusula no constituye por sí misma autorización para modificar derechos reales ni sustituye las autorizaciones administrativas o instrumentos jurídicos que legalmente correspondan.

**DÉCIMA SEGUNDA. OBLIGACIÓN DE COLABORACIÓN**

EL POSEEDOR se obliga a prestar toda colaboración razonablemente necesaria para el cumplimiento del objeto contractual.

En particular deberá:

a) proporcionar la documentación y antecedentes que obren en su poder;

b) facilitar el acceso a los inmuebles;

c) permitir las tareas de mensura e inspección;

d) concurrir cuando su presencia resulte necesaria;

e) suscribir la documentación que corresponda;

f) brindar información veraz respecto de la situación posesoria;

g) abstenerse de realizar actos que obstaculicen injustificadamente la comercialización.

El incumplimiento injustificado de esta obligación será considerado incumplimiento esencial del contrato.

**DÉCIMA TERCERA. PROHIBICIÓN DE ELUSIÓN**

LAS PARTES reconocen que la actividad desarrollada por EL COMERCIALIZADOR genera un valor económico propio y constituye presupuesto indispensable para la concreción de las operaciones.

En consecuencia, EL POSEEDOR no podrá eludir el derecho económico de EL COMERCIALIZADOR mediante la celebración directa de operaciones con personas que hubieran sido contactadas, informadas, derivadas o aproximadas al inmueble como consecuencia de la actividad desarrollada por EL COMERCIALIZADOR.

La circunstancia de que el adquirente finalmente negocie directamente con EL POSEEDOR, sus familiares, representantes o terceros vinculados no extinguirá ni reducirá el derecho de EL COMERCIALIZADOR al {{Porcentaje del comercializador|porcentaje=40}} que le corresponde.

**DÉCIMA CUARTA. PRESUNCIÓN DE VINCULACIÓN COMERCIAL**

Se considerará, salvo prueba en contrario, que existe vinculación con la actividad de EL COMERCIALIZADOR cuando el potencial adquirente:

a) haya consultado como consecuencia de una publicación realizada por éste;

b) haya sido contactado por éste;

c) haya visitado el inmueble mediante su gestión;

d) haya recibido información, documentación o material publicitario proporcionado por éste;

e) haya formulado una reserva o propuesta;

f) haya mantenido negociaciones durante la vigencia del contrato.

La protección contractual subsistirá aun cuando la operación sea finalmente instrumentada por EL POSEEDOR o por terceros.

**DÉCIMA QUINTA. SUPUESTOS DE INTERPOSICIÓN**

Las obligaciones económicas asumidas por EL POSEEDOR serán igualmente aplicables cuando una operación sea formalmente celebrada con:

a) familiares;

b) sociedades vinculadas;

c) mandatarios;

d) personas interpuestas;

e) terceros relacionados;

f) cesionarios;

g) cualquier otra persona física o jurídica utilizada con la finalidad de evitar o disminuir la participación económica de EL COMERCIALIZADOR.

La utilización de una estructura formal distinta no podrá ser invocada para desconocer la realidad económica de la operación.

**DÉCIMA SEXTA. OPERACIONES POSTERIORES A LA EXTINCIÓN**

La terminación del presente contrato no afectará el derecho de EL COMERCIALIZADOR respecto de las operaciones que se encuentren en curso al momento de su finalización ni respecto de aquellas que sean consecuencia directa de gestiones realizadas durante su vigencia.

En particular, conservará su derecho al {{Porcentaje del comercializador|porcentaje=40}} cuando, con posterioridad a la extinción:

a) se concrete una operación con un interesado previamente contactado;

b) se perfeccione una negociación iniciada durante la vigencia;

c) se concrete una venta respecto de un lote previamente publicado;

d) se utilice información, documentación, publicidad o trabajo generado por EL COMERCIALIZADOR;

e) se concrete la operación mediante una persona interpuesta.

**DÉCIMA SÉPTIMA. PROTECCIÓN DE LAS INVERSIONES**

Las inversiones y gastos realizados por EL COMERCIALIZADOR en publicidad, mensura, promoción, desarrollo y comercialización serán considerados parte integrante de las prestaciones asumidas por éste.

En caso de resolución anticipada imputable a EL POSEEDOR, éste deberá respetar los derechos económicos ya devengados y aquellos que correspondan conforme las operaciones derivadas de la actividad desarrollada hasta la fecha de terminación.

**DÉCIMA OCTAVA. INFORMACIÓN Y RENDICIÓN**

Toda suma percibida como consecuencia de una operación deberá ser informada a la otra parte.

EL POSEEDOR deberá comunicar a EL COMERCIALIZADOR, dentro de las cuarenta y ocho (48) horas de producido, cualquier pago, reserva, seña, anticipo o precio recibido de terceros respecto de los inmuebles objeto del presente.

La omisión de informar una operación no impedirá el nacimiento ni ejercicio del derecho económico de EL COMERCIALIZADOR.

**DÉCIMA NOVENA. RESPONSABILIDAD POR LA SITUACIÓN JURÍDICA**

EL POSEEDOR declara bajo su responsabilidad que la información proporcionada a EL COMERCIALIZADOR respecto de la posesión y antecedentes de los inmuebles es verdadera.

EL COMERCIALIZADOR no responderá por conflictos dominiales, registrales, sucesorios, fiscales, administrativos, posesorios o judiciales cuyo origen sea anterior a su intervención o que resulten ajenos a su actividad comercial.

La responsabilidad de EL COMERCIALIZADOR quedará circunscripta a los actos propios que realice en ejecución del presente contrato.

**VIGÉSIMA. INDEMNIDAD**

EL POSEEDOR mantendrá indemne a EL COMERCIALIZADOR frente a reclamos de terceros derivados de hechos, actos, derechos, cargas, gravámenes, conflictos posesorios o controversias jurídicas cuya causa sea anterior al presente contrato o resulte ajena a la actividad desarrollada por EL COMERCIALIZADOR.

Esta obligación subsistirá aun después de extinguido el presente contrato mientras subsistan reclamos vinculados con hechos anteriores.

**VIGÉSIMA PRIMERA. AUSENCIA DE SOCIEDAD**

El presente contrato no constituye sociedad, asociación, joint venture, sociedad de hecho ni comunidad de bienes entre LAS PARTES.

La distribución económica del {{Porcentaje del poseedor|porcentaje=60}} y {{Porcentaje del comercializador|porcentaje=40}} constituye exclusivamente el mecanismo contractual mediante el cual LAS PARTES asignan los resultados económicos de las operaciones realizadas en ejecución del presente acuerdo.

Cada parte conservará su autonomía jurídica, patrimonial y fiscal.

**VIGÉSIMA SEGUNDA. AUTONOMÍA DE LAS PARTES**

EL COMERCIALIZADOR desarrollará sus actividades con autonomía técnica, económica y organizativa.

El presente contrato no genera relación laboral alguna entre LAS PARTES ni dependencia, subordinación jurídica o económica en los términos propios de un contrato de trabajo.

**VIGÉSIMA TERCERA. PLAZO**

El presente contrato tendrá una vigencia de {{Plazo del contrato=3 (tres)}} años, contados desde su suscripción o, en su defecto hasta la venta de todos los inmuebles, o sea lo que suceda primero, siendo la prórroga será automática, Salvo que LAS PARTES decidan o contrario.

La expiración del plazo no afectará los derechos económicos que hubieran nacido durante su vigencia ni aquellos correspondientes a operaciones derivadas de las gestiones realizadas durante el período contractual.

**VIGÉSIMA CUARTA. RESCISIÓN ANTICIPADA**

Cualquiera de LAS PARTES podrá solicitar la rescisión por incumplimiento grave de la otra.

Cuando la rescisión sea provocada por incumplimiento de EL POSEEDOR, quedarán a salvo todos los derechos económicos de EL COMERCIALIZADOR derivados de operaciones concretadas, en curso o causalmente vinculadas con su actividad.

La rescisión no podrá ser utilizada como mecanismo para sustraer a EL COMERCIALIZADOR de la participación económica que legítimamente hubiera generado.

**VIGÉSIMA QUINTA. CLÁUSULA PENAL**

En caso de que EL POSEEDOR incumpla la exclusividad, celebre operaciones destinadas a eludir el derecho económico de EL COMERCIALIZADOR, o disponga de los inmuebles desconociendo el presente acuerdo, deberá abonar, en concepto de cláusula penal, una suma equivalente al {{Porcentaje de la cláusula penal|porcentaje en letras=40}} del valor económico de la operación indebidamente realizada, sin perjuicio del derecho de EL COMERCIALIZADOR a reclamar los daños adicionales que legalmente correspondan cuando éstos excedieran el monto de la penalidad pactada.

La presente cláusula tendrá por finalidad garantizar el cumplimiento efectivo de las obligaciones de exclusividad, no elusión y respeto de la participación económica convenida.

**VIGÉSIMA SEXTA. BUENA FE CONTRACTUAL**

LAS PARTES declaran celebrar el presente contrato con plena libertad y conocimiento de sus alcances, comprometiéndose a ejecutarlo conforme los principios de buena fe, cooperación, confianza legítima y conservación del negocio jurídico.

En particular, ninguna de LAS PARTES podrá adoptar conductas formalmente lícitas pero materialmente destinadas a frustrar la finalidad económica que constituyó causa determinante de la celebración del presente instrumento.

**VIGÉSIMA SÉPTIMA. INTEGRIDAD CONTRACTUAL**

El presente contrato constituye el acuerdo íntegro entre LAS PARTES respecto de su objeto.

Toda modificación, ampliación, renuncia o incorporación deberá instrumentarse por escrito y ser suscripta por ambas partes.

La eventual nulidad o ineficacia de alguna de sus cláusulas no afectará la validez del resto del contrato, debiendo procurarse, en cuanto jurídicamente resulte posible, la conservación de la finalidad económica perseguida.

**VIGÉSIMA OCTAVA. DOMICILIOS Y NOTIFICACIONES**

A todos los efectos derivados del presente contrato, LAS PARTES constituyen como domicilios especiales los indicados en el encabezamiento.

Toda modificación deberá ser comunicada fehacientemente.

Serán válidas las notificaciones cursadas mediante carta documento, acta notarial, medio electrónico que permita acreditar fehacientemente su recepción o cualquier otro mecanismo que LAS PARTES acuerden por escrito.

**VIGÉSIMA NOVENA. JURISDICCIÓN**

Para cualquier divergencia, controversia o cuestión derivada de la interpretación, ejecución, incumplimiento, resolución o extinción del presente contrato, LAS PARTES se someten a la jurisdicción de los Tribunales Ordinarios competentes del Departamento Judicial de {{Departamento judicial=Lomas de Zamora}}, con renuncia expresa a cualquier otro fuero o jurisdicción que pudiera corresponder, salvo que la legislación aplicable determine otro fuero de carácter improrrogable.

**TRIGÉSIMA. ANEXO DE INMUEBLES**

Forma parte integrante del presente contrato el ANEXO I, en el cual serán individualizados los inmuebles y/o fracciones comprendidos en el acuerdo.

En dicho anexo podrán consignarse, según corresponda:

ubicación;

nomenclatura catastral;

partida inmobiliaria;

matrícula;

superficie;

medidas;

linderos;

antecedentes posesorios;

plano;

identificación de las fracciones;

cantidad de lotes;

precio de referencia;

cualquier otro dato necesario para su correcta individualización.

**TRIGÉSIMA PRIMERA. DECLARACIÓN FINAL**

LAS PARTES declaran que el presente contrato constituye la expresión fiel de su voluntad negocial y que han tenido especialmente en consideración, para su celebración, la situación posesoria invocada por EL POSEEDOR y la actividad comercial, técnica y económica que será desarrollada por EL COMERCIALIZADOR.

En consecuencia, reconocen que la distribución económica pactada del {{Porcentaje del poseedor|porcentaje en letras=60}} para EL POSEEDOR y {{Porcentaje del comercializador|porcentaje en letras=40}} para EL COMERCIALIZADOR constituye un elemento esencial del equilibrio contractual y una condición determinante para la celebración del presente acuerdo.

En prueba de conformidad, se firman DOS (2) ejemplares de un mismo tenor y a un solo efecto, en la ciudad de {{Ciudad de firma}}, a los {{Día de firma}} días del mes de {{Mes de firma}} de {{Año de firma=2026}}.

**EL POSEEDOR**

Firma: ____________________________
Aclaración: {{Nombre del poseedor}}
DNI Nº {{DNI del poseedor}}

**EL COMERCIALIZADOR**

Firma: ____________________________
Aclaración: MATÍAS JAVIER DE NUNZIO
DNI Nº 32.917.792

**ANEXO I — INDIVIDUALIZACIÓN DE LOS INMUEBLES**

{{Inmuebles del Anexo I|texto largo=INMUEBLE Nº 1
Ubicación: 
Partida: 
Nomenclatura catastral: 
Matrícula: 
Superficie: 
Medidas y linderos: 
Fracción/Lote: 
Observaciones: }}`,
  },
];
