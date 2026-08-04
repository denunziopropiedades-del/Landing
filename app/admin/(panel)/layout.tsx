import Link from "next/link";
import {
  BarChart3,
  Building2,
  FileSliders,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Newspaper,
  Star,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logoutAction } from "@/lib/admin/actions";

const nav = [
  { href: "/admin", label: "Estadísticas", icon: LayoutDashboard },
  { href: "/admin/lotes", label: "Lotes y precios", icon: BarChart3 },
  { href: "/admin/contenido", label: "Contenido del sitio", icon: FileSliders },
  { href: "/admin/galeria", label: "Galería", icon: ImageIcon },
  { href: "/admin/testimonios", label: "Testimonios", icon: Star },
  { href: "/admin/novedades", label: "Novedades", icon: Newspaper },
  { href: "/admin/consultas", label: "Consultas", icon: MessageSquareText },
  { href: "/admin/proyectos", label: "Proyectos", icon: Building2 },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-black text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-display text-lg font-bold">Ayres de Guernica</p>
          <p className="text-xs text-white/50">Panel administrador</p>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/75 transition hover:bg-white/5 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <form action={logoutAction} className="border-t border-white/10 p-3">
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </form>
      </aside>

      <div className="flex-1">
        {!configured && (
          <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 sm:text-sm">
            Modo demo: Supabase no está configurado. Los cambios que hagas acá no se van a guardar. Ver README para
            configurarlo.
          </div>
        )}
        <main className="p-4 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
