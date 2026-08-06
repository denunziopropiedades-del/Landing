"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { responderChat } from "@/lib/chatbot";

type Mensaje = { autor: "bot" | "user"; texto: string };

const SALUDO_INICIAL: Mensaje = {
  autor: "bot",
  texto: "¡Hola! Soy el asistente virtual de Matu Lotes. Preguntame sobre precios, ubicación, financiación o cómo reservar tu lote.",
};

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([SALUDO_INICIAL]);
  const [input, setInput] = useState("");

  const enviar = () => {
    const texto = input.trim();
    if (!texto) return;
    const respuesta = responderChat(texto);
    setMensajes((prev) => [...prev, { autor: "user", texto }, { autor: "bot", texto: respuesta }]);
    setInput("");
  };

  return (
    <div className="fixed bottom-24 right-5 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            className="mb-3 flex h-[26rem] w-[22rem] max-w-[90vw] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-2xl"
          >
            <div className="flex items-center justify-between bg-brand-green-700 px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-gold-400" />
                <span className="text-sm font-semibold">Asistente Matu Lotes</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {mensajes.map((m, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                    m.autor === "bot"
                      ? "bg-brand-cream text-brand-black"
                      : "ml-auto bg-brand-green-700 text-white"
                  }`}
                >
                  {m.texto}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                enviar();
              }}
              className="flex gap-2 border-t border-black/5 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribí tu consulta..."
                className="flex-1 rounded-full border border-black/10 px-4 py-2 text-sm focus:border-brand-green-600 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Enviar"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-700 text-white hover:bg-brand-green-600"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir asistente virtual"
        className="ml-auto flex items-center gap-2 rounded-full bg-brand-black px-4 py-3.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105"
      >
        <Bot className="h-5 w-5 text-brand-gold-400" />
        <span className="hidden text-sm font-semibold sm:inline">Asistente</span>
      </button>
    </div>
  );
}
