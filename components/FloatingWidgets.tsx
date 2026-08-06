"use client";

import { usePathname } from "next/navigation";
import WhatsappFloatButton from "@/components/WhatsappFloatButton";
import ChatbotWidget from "@/components/ChatbotWidget";
import AgendaFloatButton from "@/components/AgendaFloatButton";

export default function FloatingWidgets({ mensaje, numero }: { mensaje?: string; numero?: string }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/admin")) return null;

  return (
    <>
      <AgendaFloatButton />
      <WhatsappFloatButton mensaje={mensaje} numero={numero} />
      <ChatbotWidget />
    </>
  );
}
