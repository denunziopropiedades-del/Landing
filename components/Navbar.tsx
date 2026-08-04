"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { buildWhatsappUrl } from "@/lib/whatsapp";

const links = [
  { href: "#inicio", label: "Inicio" },
  { href: "#proyecto", label: "Proyecto" },
  { href: "#lotes", label: "Lotes" },
  { href: "#ubicacion", label: "Ubicación" },
  { href: "#financiacion", label: "Financiación" },
  { href: "#contacto", label: "Contacto" },
];

export default function Navbar({ numero }: { numero?: string } = {}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled || open ? "bg-brand-black/95 shadow-lg backdrop-blur" : "bg-gradient-to-b from-black/60 to-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="#inicio" className="font-display text-lg font-bold tracking-wide text-white sm:text-xl">
          Ayres <span className="text-brand-gold-400">de Guernica</span>
        </Link>

        <ul className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-sm font-medium text-white/90 transition hover:text-brand-gold-400">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden lg:block">
          <a
            href={buildWhatsappUrl(undefined, numero)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-brand-gold-500 px-5 py-2.5 text-sm font-semibold text-brand-black transition hover:bg-brand-gold-400"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Abrir menú"
          className="text-white lg:hidden"
        >
          {open ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-brand-black px-4 pb-6 pt-2 lg:hidden">
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-3 text-white/90 hover:bg-white/5 hover:text-brand-gold-400"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <a
            href={buildWhatsappUrl(undefined, numero)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center justify-center gap-2 rounded-full bg-brand-gold-500 px-5 py-3 text-sm font-semibold text-brand-black"
          >
            <MessageCircle className="h-4 w-4" />
            Escribinos por WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}
