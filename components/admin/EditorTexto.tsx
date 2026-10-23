"use client";

import { useEffect, useRef, useState } from "react";
import { Bold, Eraser, Highlighter, Italic, List, ListOrdered, Type, Underline } from "lucide-react";
import { COLORES_LETRA, FUENTES, RESALTADOS, sanitizarHtml, textoAHtml } from "@/lib/texto-enriquecido";

/**
 * Editor de texto con formato (negrita, cursiva, subrayado, tipo de letra, resaltado,
 * color y listas). Guarda HTML limpio en un input oculto con el `name` indicado.
 */
export default function EditorTexto({ name, valorInicial = "", placeholder }: { name: string; valorInicial?: string; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(() => sanitizarHtml(textoAHtml(valorInicial)));
  const [menu, setMenu] = useState<"resaltar" | "color" | "fuente" | null>(null);
  const [activos, setActivos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (ref.current) ref.current.innerHTML = html;
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const actualizar = () => {
    if (!ref.current) return;
    setHtml(sanitizarHtml(ref.current.innerHTML));
    setActivos({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
    });
  };

  const cmd = (comando: string, valor?: string) => {
    ref.current?.focus();
    try {
      document.execCommand("styleWithCSS", false, "true");
    } catch {}
    document.execCommand(comando, false, valor);
    setMenu(null);
    actualizar();
  };

  const boton = (activo: boolean) =>
    `flex h-8 min-w-8 items-center justify-center gap-1 rounded-md px-1.5 text-sm transition ${activo ? "bg-brand-black text-white" : "text-brand-black/75 hover:bg-black/5"}`;

  // Evita que el botón le saque el foco (y la selección) al texto.
  const sinFoco = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="rounded-lg border border-black/10 bg-white focus-within:border-brand-green-600">
      <div className="relative flex flex-wrap items-center gap-0.5 border-b border-black/10 p-1">
        <button type="button" title="Negrita" onMouseDown={sinFoco} onClick={() => cmd("bold")} className={boton(!!activos.bold)}>
          <Bold className="h-4 w-4" />
        </button>
        <button type="button" title="Cursiva" onMouseDown={sinFoco} onClick={() => cmd("italic")} className={boton(!!activos.italic)}>
          <Italic className="h-4 w-4" />
        </button>
        <button type="button" title="Subrayado" onMouseDown={sinFoco} onClick={() => cmd("underline")} className={boton(!!activos.underline)}>
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-black/10" />

        <button type="button" title="Tipo de letra" onMouseDown={sinFoco} onClick={() => setMenu(menu === "fuente" ? null : "fuente")} className={boton(menu === "fuente")}>
          <Type className="h-4 w-4" />
          <span className="text-xs font-semibold">Letra</span>
        </button>
        <button type="button" title="Resaltar texto" onMouseDown={sinFoco} onClick={() => setMenu(menu === "resaltar" ? null : "resaltar")} className={boton(menu === "resaltar")}>
          <Highlighter className="h-4 w-4" />
          <span className="text-xs font-semibold">Resaltar</span>
        </button>
        <button type="button" title="Color de letra" onMouseDown={sinFoco} onClick={() => setMenu(menu === "color" ? null : "color")} className={boton(menu === "color")}>
          <span className="text-sm font-extrabold underline decoration-[#9a6b1f] decoration-2">A</span>
          <span className="text-xs font-semibold">Color</span>
        </button>
        <span className="mx-1 h-5 w-px bg-black/10" />

        <button type="button" title="Lista con viñetas" onMouseDown={sinFoco} onClick={() => cmd("insertUnorderedList")} className={boton(false)}>
          <List className="h-4 w-4" />
        </button>
        <button type="button" title="Lista numerada" onMouseDown={sinFoco} onClick={() => cmd("insertOrderedList")} className={boton(false)}>
          <ListOrdered className="h-4 w-4" />
        </button>
        <button type="button" title="Quitar formato" onMouseDown={sinFoco} onClick={() => cmd("removeFormat")} className={boton(false)}>
          <Eraser className="h-4 w-4" />
        </button>

        {menu && (
          <div className="absolute left-1 top-full z-20 mt-1 flex flex-wrap gap-1 rounded-lg border border-black/10 bg-white p-2 shadow-lg">
            {menu === "fuente" &&
              FUENTES.map((f) => (
                <button key={f.id} type="button" onMouseDown={sinFoco} onClick={() => cmd("fontName", f.css)} className="rounded-md px-3 py-1.5 text-sm hover:bg-black/5" style={{ fontFamily: f.css }}>
                  {f.label}
                </button>
              ))}
            {menu === "resaltar" && (
              <>
                {RESALTADOS.map((r) => (
                  <button key={r.color} type="button" title={r.label} onMouseDown={sinFoco} onClick={() => cmd("hiliteColor", r.color)} className="h-7 w-7 rounded-md border border-black/10" style={{ background: r.color }} />
                ))}
                <button type="button" onMouseDown={sinFoco} onClick={() => cmd("hiliteColor", "transparent")} className="rounded-md px-2 text-xs font-semibold text-brand-black/60 hover:bg-black/5">
                  Sin resaltar
                </button>
              </>
            )}
            {menu === "color" &&
              COLORES_LETRA.map((c) => (
                <button key={c.color} type="button" title={c.label} onMouseDown={sinFoco} onClick={() => cmd("foreColor", c.color)} className="flex h-7 w-7 items-center justify-center rounded-md border border-black/10 text-sm font-extrabold" style={{ color: c.color }}>
                  A
                </button>
              ))}
          </div>
        )}
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Descripción"
        data-placeholder={placeholder}
        onInput={actualizar}
        onKeyUp={actualizar}
        onMouseUp={actualizar}
        onBlur={actualizar}
        onPaste={(e) => {
          // Al pegar desde Word o la web se limpia el formato raro, conservando negritas, cursivas y listas.
          const htmlPegado = e.clipboardData.getData("text/html");
          if (htmlPegado) {
            e.preventDefault();
            document.execCommand("insertHTML", false, sanitizarHtml(htmlPegado));
            actualizar();
          }
        }}
        className="prose-desc min-h-[160px] px-3 py-2.5 text-sm leading-relaxed outline-none empty:before:text-brand-black/35 empty:before:content-[attr(data-placeholder)] [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
