"use client";

import { usePathname } from "next/navigation";
import WhatsappFloatButton from "@/components/WhatsappFloatButton";
import ChatbotWidget from "@/components/ChatbotWidget";
import AgendaFloatButton from "@/components/AgendaFloatButton";

export default function FloatingWidgets({ mensaje, numero }: { mensaje?: string; numero?: string }) {
  const pathname = usePathname();
  // Estos widgets son de la marca inmobiliaria: no deben aparecer en el panel
  // admin ni en el módulo de selección de personal (negocio aparte).
  if (pathname?.startsWith("/admin") || pathname?.startsWith("/postulantes") || pathname?.startsWith("/postularme")) {
    return null;
  }

  return (
    <>
      <AgendaFloatButton />
      <WhatsappFloatButton mensaje={mensaje} numero={numero} />
      <ChatbotWidget />
    </>
  );
}
