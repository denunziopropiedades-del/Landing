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

export type TipoCampo = "texto" | "fecha" | "hora" | "numero" | "texto largo";

export type Campo = { clave: string; etiqueta: string; tipo: TipoCampo; porDefecto: string };

export type Modelo = {
  id: string;
  nombre: string;
  categoria: string;
  cuerpo: string;
  incorporado?: boolean; // modelos que vienen con el sistema
};

const RE_CAMPO = /\{\{\s*([^{}|=]+?)\s*(?:\|\s*([^{}=]+?)\s*)?(?:=\s*([^{}]*?)\s*)?\}\}/g;

const TIPOS: TipoCampo[] = ["texto", "fecha", "hora", "numero", "texto largo"];

/** Campos de un modelo, en orden de aparición y sin repetir. */
export function camposDe(cuerpo: string): Campo[] {
  const vistos = new Map<string, Campo>();
  for (const m of cuerpo.matchAll(RE_CAMPO)) {
    const etiqueta = m[1].trim();
    const clave = etiqueta.toLowerCase();
    const tipoRaw = (m[2] ?? "texto").trim().toLowerCase() as TipoCampo;
    const tipo = TIPOS.includes(tipoRaw) ? tipoRaw : "texto";
    const previo = vistos.get(clave);
    if (!previo) vistos.set(clave, { clave, etiqueta, tipo, porDefecto: (m[3] ?? "").trim() });
    else if (!previo.porDefecto && m[3]) previo.porDefecto = m[3].trim();
  }
  return [...vistos.values()];
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
export function formatearValor(tipo: TipoCampo, valor: string): string {
  const v = (valor ?? "").trim();
  if (!v) return v;
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
  return cuerpo.replace(RE_CAMPO, (_t, etiqueta: string) => {
    const c = campos.get(etiqueta.trim().toLowerCase());
    const valor = valores[etiqueta.trim().toLowerCase()];
    if (!c) return "";
    const final = valor !== undefined && valor.trim() !== "" ? valor : c.porDefecto;
    return final ? formatearValor(c.tipo, final) : "________________";
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
