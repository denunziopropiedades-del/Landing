"use client";

import { MessageCircle } from "lucide-react";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export default function WhatsappFloatButton({ mensaje, numero }: { mensaje?: string; numero?: string }) {
  return (
    <a
      href={buildWhatsappUrl(mensaje, numero)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-white shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95 sm:px-5"
    >
      <MessageCircle className="h-6 w-6 fill-white" strokeWidth={0} />
      <span className="hidden text-sm font-semibold sm:inline">WhatsApp</span>
    </a>
  );
}
