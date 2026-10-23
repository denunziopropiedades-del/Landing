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
