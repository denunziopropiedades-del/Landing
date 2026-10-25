"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronRight,
  ClipboardCheck,
  House,
  KeyRound,
  LayoutGrid,
  Map as MapIcon,
  MapPin,
  Menu,
  MessageCircle,
  Tag,
  Wheat,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buildWhatsappUrl } from "@/lib/whatsapp";

export type NavLink = { href: string; label: string; icon?: LucideIcon; descripcion?: string; destacado?: boolean };

/** Menú principal del portal inmobiliario. */
export const NAV_LINKS_PORTAL: NavLink[] = [
  { href: "/", label: "Inicio", icon: House, descripcion: "Volver a la página principal" },
  { href: "/comprar", label: "Comprar", icon: Tag, descripcion: "Casas, departamentos y terrenos" },
  { href: "/alquilar", label: "Alquilar", icon: KeyRound, descripcion: "Casas y departamentos en alquiler" },
  { href: "/campos", label: "Campos", icon: Wheat, descripcion: "Venta y arrendamiento por hectárea" },
  { href: "/desarrollos", label: "DESARROLLOS", icon: LayoutGrid, descripcion: "Lotes en Ayres de Guernica y más", destacado: true },
  { href: "/mapa", label: "Mapa", icon: MapIcon, descripcion: "Todas las ubicaciones en el mapa" },
  { href: "/zonas", label: "Zonas", icon: MapPin, descripcion: "Gran La Plata · Corredor Sur · Ruta 3 y 205 · Ribera" },
  { href: "/tasaciones", label: "Tasaciones", icon: ClipboardCheck, descripcion: "Vendé o alquilá con nosotros" },
];

/** Menú de la página de un desarrollo (secciones de la misma página). */
export const NAV_LINKS_PROYECTO: NavLink[] = [
  { href: "#inicio", label: "El barrio" },
  { href: "#lotes", label: "Lotes" },
  { href: "#ubicacion", label: "Ubicación" },
  { href: "#financiacion", label: "Financiación" },
  { href: "#contacto", label: "Contacto" },
  { href: "/desarrollos", label: "DESARROLLOS", icon: LayoutGrid, destacado: true },
];

function activo(pathname: string, href: string) {
  if (href.startsWith("#")) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar({
  numero,
  marca = "Matu Lotes",
  links = NAV_LINKS_PORTAL,
  logoHref = "/",
}: {
  numero?: string;
  marca?: string;
  links?: NavLink[];
  logoHref?: string;
}) {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  const [primero, ...resto] = marca.split(" ");
  const esPortal = links === NAV_LINKS_PORTAL;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-colors duration-300",
        scrolled || open ? "bg-brand-black/95 shadow-lg backdrop-blur" : "bg-gradient-to-b from-black/70 to-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={logoHref} className="shrink-0 leading-none text-white">
          <span className="font-display text-lg font-bold tracking-wide sm:text-xl">
            {primero} <span className="text-brand-gold-400">{resto.join(" ")}</span>
          </span>
          {esPortal && (
            <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.2em] text-white/55">
              De Nunzio · Inmobiliaria
            </span>
          )}
        </Link>

        <ul className="hidden items-center gap-1 xl:flex">
          {links.map((link) => {
            const Icono = link.icon;
            const on = activo(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition",
                    link.destacado
                      ? "bg-brand-gold-500 text-brand-black hover:bg-brand-gold-400"
                      : on
                        ? "bg-white/15 text-white"
                        : "text-white/85 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {Icono && <Icono className="h-4 w-4" />}
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          {/* Botón Home: siempre visible para volver al inicio. */}
          <Link
            href="/"
            aria-label="Volver al inicio"
            title="Inicio"
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20",
              esPortal && "xl:hidden"
            )}
          >
            <House className="h-5 w-5" />
          </Link>
          <a
            href={buildWhatsappUrl(undefined, numero)}
            target="_blank"
            rel="noopener"
            className="hidden items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white transition hover:brightness-110 xl:inline-flex"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white xl:hidden"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>

      {open && (
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-brand-black px-4 pb-6 pt-3 xl:hidden">
          <ul className="flex flex-col gap-2">
            {(esPortal ? links : [{ href: "/", label: "Inicio", icon: House, descripcion: "Volver a la página principal" }, ...links]).map(
              (link) => {
                const Icono = link.icon ?? Building2;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3.5 rounded-2xl px-4 py-3",
                        link.destacado ? "bg-brand-gold-500 text-brand-black" : "bg-white/5 text-white hover:bg-white/10"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                          link.destacado ? "bg-black/10" : "bg-white/10"
                        )}
                      >
                        <Icono className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1">
                        <span className="block font-semibold">{link.label}</span>
                        {link.descripcion && <span className="block text-xs opacity-70">{link.descripcion}</span>}
                      </span>
                      <ChevronRight className="h-4 w-4 opacity-60" />
                    </Link>
                  </li>
                );
              }
            )}
          </ul>
          <a
            href={buildWhatsappUrl(undefined, numero)}
            target="_blank"
            rel="noopener"
            className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3.5 text-sm font-bold text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Escribinos por WhatsApp
          </a>
        </div>
      )}
    </header>
  );
}
