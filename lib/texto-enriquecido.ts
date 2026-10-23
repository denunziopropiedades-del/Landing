/**
 * Texto con formato para descripciones (negrita, cursiva, subrayado, resaltado, color,
 * tipo de letra y listas). El HTML se limpia con una lista blanca: solo pasan estas
 * etiquetas y estilos, así una descripción nunca puede inyectar código en la web.
 * Sin dependencias: se usa en el servidor y en el navegador.
 */

export const FUENTES = [
  { id: "moderna", label: "Moderna", css: "var(--font-inter), system-ui, sans-serif" },
  { id: "titulos", label: "Títulos", css: "var(--font-display), system-ui, sans-serif" },
  { id: "clasica", label: "Clásica", css: "Georgia, 'Times New Roman', serif" },
  { id: "maquina", label: "Máquina", css: "'Courier New', Courier, monospace" },
] as const;

export const RESALTADOS = [
  { label: "Amarillo", color: "#fde68a" },
  { label: "Verde", color: "#bbf7d0" },
  { label: "Celeste", color: "#bae6fd" },
  { label: "Rosa", color: "#fbcfe8" },
  { label: "Dorado", color: "#f3e2b3" },
];

export const COLORES_LETRA = [
  { label: "Negro", color: "#0b0f0d" },
  { label: "Verde", color: "#154a2e" },
  { label: "Dorado", color: "#9a6b1f" },
  { label: "Rojo", color: "#b91c1c" },
  { label: "Azul", color: "#1d4ed8" },
];

const ETIQUETAS = new Set(["b", "strong", "i", "em", "u", "s", "mark", "span", "p", "div", "br", "ul", "ol", "li", "h3", "h4", "font"]);
const VACIAS = new Set(["br"]);
const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*[\d.]+%?\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(,\s*[\d.]+\s*)?\)|transparent)$/i;

function fuenteSegura(valor: string): string | null {
  const v = valor.toLowerCase();
  if (v.includes("courier") || v.includes("mono")) return FUENTES[3].css;
  if (v.includes("georgia") || v.includes("times") || v.includes("serif") && !v.includes("sans")) return FUENTES[2].css;
  if (v.includes("display") || v.includes("poppins")) return FUENTES[1].css;
  if (v.includes("inter") || v.includes("sans") || v.includes("system")) return FUENTES[0].css;
  return null;
}

function estiloSeguro(style: string): string {
  const out: string[] = [];
  for (const decl of style.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const val = decl.slice(i + 1).trim().replace(/!important/i, "").trim();
    if ((prop === "background-color" || prop === "color") && COLOR.test(val)) out.push(`${prop}: ${val}`);
    else if (prop === "font-family") {
      const f = fuenteSegura(val);
      if (f) out.push(`font-family: ${f}`);
    } else if (prop === "font-weight" && /^(bold|[6-9]00)$/.test(val)) out.push("font-weight: 700");
    else if (prop === "font-style" && val === "italic") out.push("font-style: italic");
    else if (prop === "text-decoration" || prop === "text-decoration-line") {
      if (/underline/.test(val)) out.push("text-decoration: underline");
    } else if (prop === "text-align" && /^(left|center|right|justify)$/.test(val)) out.push(`text-align: ${val}`);
  }
  return out.join("; ");
}

/** Limpia HTML dejando solo el formato permitido. */
export function sanitizarHtml(html: string): string {
  if (!html) return "";
  const partes = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1>/gi, "")
    .split(/(<[^>]*>)/g);
  const abiertas: string[] = [];
  let res = "";
  for (const p of partes) {
    if (!p) continue;
    if (!p.startsWith("<")) {
      res += p.replace(/[<>]/g, "");
      continue;
    }
    const m = /^<\s*(\/)?\s*([a-z0-9]+)([^>]*)>$/i.exec(p);
    if (!m) continue;
    const cierre = Boolean(m[1]);
    let tag = m[2].toLowerCase();
    if (!ETIQUETAS.has(tag)) continue;
    const attrs = m[3] ?? "";
    // <font face/color> (lo genera Chrome en algunos casos) se convierte a <span style>
    let estilo = "";
    const st = /style\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
    if (st) estilo = estiloSeguro(st[2] ?? st[3] ?? "");
    if (tag === "font") {
      const face = /face\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const color = /color\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
      const extra = [
        face ? `font-family: ${face[2] ?? face[3]}` : "",
        color ? `color: ${color[2] ?? color[3]}` : "",
      ].join(";");
      estilo = estiloSeguro(`${estilo};${extra}`);
      tag = "span";
    }
    if (tag === "strong") tag = "b";
    if (tag === "em") tag = "i";
    if (tag === "div") tag = "p";
    if (cierre) {
      const idx = abiertas.lastIndexOf(tag);
      if (idx < 0) continue;
      while (abiertas.length > idx) res += `</${abiertas.pop()}>`;
      continue;
    }
    if (VACIAS.has(tag)) {
      res += `<${tag}>`;
      continue;
    }
    res += estilo ? `<${tag} style="${estilo.replace(/"/g, "'")}">` : `<${tag}>`;
    abiertas.push(tag);
  }
  while (abiertas.length) res += `</${abiertas.pop()}>`;
  return res.replace(/(<p>\s*(<br>)?\s*<\/p>\s*){2,}/g, "<p><br></p>").trim();
}

export function esHtml(texto: string) {
  return /<\s*(b|strong|i|em|u|span|mark|p|div|br|ul|ol|li|h3|h4|font)\b/i.test(texto ?? "");
}

/** Texto sin formato (para resúmenes, mails o metadatos). */
export function textoPlano(texto: string) {
  if (!esHtml(texto)) return texto ?? "";
  return texto
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h3|h4)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Convierte texto plano (descripciones viejas) a HTML para editarlo. */
export function textoAHtml(texto: string) {
  if (!texto) return "";
  if (esHtml(texto)) return texto;
  const esc = texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return esc
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
}
