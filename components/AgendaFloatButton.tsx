import Link from "next/link";
import { CalendarCheck } from "lucide-react";

export default function AgendaFloatButton() {
  return (
    <Link
      href="/visita-online"
      aria-label="Agendar una visita online"
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-brand-gold-500 px-4 py-3.5 text-brand-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95 sm:px-5"
    >
      <CalendarCheck className="h-6 w-6" />
      <span className="hidden text-sm font-semibold sm:inline">Agendar visita</span>
    </Link>
  );
}
