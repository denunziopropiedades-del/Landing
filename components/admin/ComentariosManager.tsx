"use client";

import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Lock, MessageCircle, Check, RotateCcw } from "lucide-react";
import { getComentarios, marcarComentarioAction, responderComentarioAction, type Comentario } from "@/lib/admin/comentarios-actions";

const RED = {
  facebook: { nombre: "Facebook", color: "#0a7cff" },
  instagram: { nombre: "Instagram", color: "#e1306c" },
} as const;

function cuando(iso: string) {
  return new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" });
}

export default function ComentariosManager({ iniciales }: { iniciales: Comentario[] }) {
  const [lista, setLista] = useState(iniciales);
  const [filtro, setFiltro] = useState<"pendientes" | "todos" | "facebook" | "instagram">("pendientes");
  const [borradores, setBorradores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [ocupado, start] = useTransition();

  const visibles = useMemo(
    () =>
      lista.filter((c) =>
        filtro === "pendientes" ? !c.atendido : filtro === "facebook" || filtro === "instagram" ? c.red === filtro : true
      ),
    [lista, filtro]
  );
  const pendientes = lista.filter((c) => !c.atendido).length;

  const refrescar = () =>
    start(async () => {
      const r = await getComentarios();
      setLista(r.comentarios);
    });

  const responder = (c: Comentario, privado: boolean) => {
    const texto = (borradores[c.id] ?? "").trim();
    if (!texto) return;
    start(async () => {
      const r = await responderComentarioAction(c.id, texto, privado);
      if (!r.ok) {
        setErrores((e) => ({ ...e, [c.id]: r.error }));
        return;
      }
      setErrores((e) => ({ ...e, [c.id]: "" }));
      setBorradores((b) => ({ ...b, [c.id]: "" }));
      setLista((l) =>
        l.map((x) => (x.id === c.id ? { ...x, atendido: true, respuesta: texto, respuestaPrivada: privado, respondidoEn: new Date().toISOString() } : x))
      );
    });
  };

  const marcar = (c: Comentario, atendido: boolean) =>
    start(async () => {
      const r = await marcarComentarioAction(c.id, atendido);
      if (r.ok) setLista((l) => l.map((x) => (x.id === c.id ? { ...x, atendido } : x)));
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(
          [
            ["pendientes", `Sin responder (${pendientes})`],
            ["todos", "Todos"],
            ["facebook", "Facebook"],
            ["instagram", "Instagram"],
          ] as const
        ).map(([id, txt]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${filtro === id ? "bg-brand-black text-white" : "bg-white text-brand-black/70"}`}
          >
            {txt}
          </button>
        ))}
        <button onClick={refrescar} disabled={ocupado} className="ml-auto flex items-center gap-1 text-xs font-semibold text-brand-black/60">
          <RotateCcw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {visibles.length === 0 && (
        <div className="rounded-xl border border-black/5 bg-white p-10 text-center text-sm text-brand-black/50">
          <MessageCircle className="mx-auto mb-2 h-8 w-8" />
          {filtro === "pendientes" ? "No hay comentarios sin responder." : "Todavía no llegaron comentarios."}
        </div>
      )}

      <ul className="space-y-3">
        {visibles.map((c) => (
          <li key={c.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full px-2 py-0.5 font-bold text-white" style={{ background: RED[c.red as keyof typeof RED].color }}>
                {RED[c.red as keyof typeof RED].nombre}
              </span>
              <b className="text-sm text-brand-black">{c.autor}</b>
              <span className="text-brand-black/50">{cuando(c.creadoEn)}</span>
              {c.postLink && (
                <a href={c.postLink} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 font-semibold text-brand-black/60 hover:underline">
                  Ver publicación <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
            {c.postTexto && <p className="mt-1 truncate text-xs text-brand-black/40">En: “{c.postTexto}”</p>}
            <p className="mt-2 whitespace-pre-wrap text-sm text-brand-black">{c.texto}</p>

            {c.respuesta ? (
              <div className="mt-3 rounded-lg bg-[#e9f9ef] px-3 py-2 text-sm">
                <p className="mb-0.5 flex items-center gap-1 text-xs font-semibold text-[#128c4a]">
                  {c.respuestaPrivada ? <Lock className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {c.respuestaPrivada ? "Respondido por privado" : "Respondido en público"}
                  {c.respondidoEn ? ` · ${cuando(c.respondidoEn)}` : ""}
                </p>
                <p className="whitespace-pre-wrap">{c.respuesta}</p>
              </div>
            ) : (
              <div className="mt-3">
                <textarea
                  value={borradores[c.id] ?? ""}
                  onChange={(e) => setBorradores((b) => ({ ...b, [c.id]: e.target.value }))}
                  placeholder="Escribí la respuesta…"
                  className="h-16 w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-black/40 focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => responder(c, false)}
                    disabled={ocupado || !(borradores[c.id] ?? "").trim()}
                    className="rounded-lg bg-brand-black px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40"
                  >
                    Responder en público
                  </button>
                  <button
                    onClick={() => responder(c, true)}
                    disabled={ocupado || !(borradores[c.id] ?? "").trim()}
                    className="flex items-center gap-1 rounded-lg border border-black/15 px-3 py-1.5 text-xs font-bold text-brand-black disabled:opacity-40"
                    title="Le llega por Messenger o Instagram Direct. Meta permite un solo mensaje privado por comentario."
                  >
                    <Lock className="h-3 w-3" /> Responder por privado
                  </button>
                  <button
                    onClick={() => marcar(c, !c.atendido)}
                    disabled={ocupado}
                    className="ml-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-brand-black/60"
                  >
                    {c.atendido ? "Marcar pendiente" : "Marcar como atendido"}
                  </button>
                </div>
              </div>
            )}
            {errores[c.id] && <p className="mt-2 text-xs text-red-600">{errores[c.id]}</p>}
            {!errores[c.id] && c.error && !c.respuesta && <p className="mt-2 text-xs text-red-600">Último error: {c.error}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
