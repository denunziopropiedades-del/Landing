"use client";

import { usePathname } from "next/navigation";
import WhatsappFloatButton from "@/components/WhatsappFloatButton";
import ChatbotWidget from "@/components/ChatbotWidget";
import AgendaFloatButton from "@/components/AgendaFloatButton";

/** Páginas privadas de clientes (links con token): sin botones flotantes ni "Vi esto en" con el link. */
export const RUTAS_PRIVADAS_CLIENTE = ["/firma", "/mis-cuotas", "/mi-alquiler", "/cliente", "/verificar", "/pago-reserva", "/visita/reprogramar"];

export default function FloatingWidgets({ mensaje, numero }: { mensaje?: string; numero?: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/landing")) return null;
  if (RUTAS_PRIVADAS_CLIENTE.some((r) => pathname === r || pathname?.startsWith(`${r}/`))) return null;

  return (
    <>
      <AgendaFloatButton />
      <WhatsappFloatButton mensaje={mensaje} numero={numero} />
      <ChatbotWidget />
    </>
  );
}
