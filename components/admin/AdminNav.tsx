"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  DollarSign,
  FileSignature,
  FileSliders,
  FileText,
  HelpCircle,
  House,
  Image as ImageIcon,
  Images,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  MessagesSquare,
  Newspaper,
  Receipt,
  ShieldCheck,
  Star,
  Target,
  Users,
} from "lucide-react";

const ICONOS = {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  DollarSign,
  FileSignature,
  FileSliders,
  FileText,
  HelpCircle,
  House,
  Image: ImageIcon,
  Images,
  KanbanSquare,
  KeyRound,
  LayoutDashboard,
  Mail,
  MessageSquareText,
  MessagesSquare,
  Newspaper,
  Receipt,
  ShieldCheck,
  Star,
  Target,
  Users,
};

export type IconoNav = keyof typeof ICONOS;

type Seccion = { titulo: string; items: { href: string; label: string; icon: IconoNav }[] };

/** Menú lateral del panel, agrupado por secciones y con la página actual resaltada. */
export default function AdminNav({ secciones, badges = {} }: { secciones: Seccion[]; badges?: Record<string, number> }) {
  const ruta = usePathname();
  const activa = (href: string) => (href === "/admin" ? ruta === "/admin" : ruta === href || ruta.startsWith(`${href}/`));

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3">
      {secciones.map((sec) => (
        <div key={sec.titulo} className="mb-3">
          <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-wider text-white/35">{sec.titulo}</p>
          <div className="space-y-0.5">
            {sec.items.map((item) => {
              const Icon = ICONOS[item.icon];
              const on = activa(item.href);
              const n = badges[item.href] ?? 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    on ? "bg-brand-gold-400/15 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${on ? "text-brand-gold-400" : ""}`} />
                  {item.label}
                  {n > 0 && (
                    <span className="ml-auto rounded-full bg-brand-gold-500 px-2 py-0.5 text-[11px] font-extrabold text-brand-black">{n}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
