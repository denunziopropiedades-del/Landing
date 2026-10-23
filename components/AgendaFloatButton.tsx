"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck } from "lucide-react";

/** Botón flotante "Agendar visita": si el visitante está viendo una propiedad o un desarrollo, agenda esa. */
export default function AgendaFloatButton() {
  const pathname = usePathname() ?? "/";
  const prop = /^\/propiedades\/([^/]+)/.exec(pathname);
  const desa = /^\/desarrollos\/([^/]+)/.exec(pathname);
  const href = prop ? `/visitas?propiedad=${prop[1]}` : desa ? `/visitas?proyecto=${desa[1]}` : "/visitas";
  if (pathname.startsWith("/visitas")) return null;
  return (
    <Link
      href={href}
      aria-label="Agendar una visita"
      className="fixed bottom-5 left-5 z-50 flex items-center gap-2 rounded-full bg-brand-gold-500 px-4 py-3.5 text-brand-black shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-transform hover:scale-105 active:scale-95 sm:px-5"
    >
      <CalendarCheck className="h-6 w-6" />
      <span className="hidden text-sm font-semibold sm:inline">Agendar visita</span>
    </Link>
  );
}
