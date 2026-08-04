import Link from "next/link";
import {
  Activity,
  BarChart3,
  Building2,
  FileSliders,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Images,
  KanbanSquare,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Newspaper,
  Star,
  Users,
} from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logoutAction } from "@/lib/admin/actions";
import { getPerfilActual } from "@/lib/admin/auth";
import MobileNavSelect from "@/components/admin/MobileNavSelect";
import type { Rol } from "@/types/site";

const nav: { href: string; label: string; icon: typeof LayoutDashboard; roles?: Rol[] }[] = [
  { href: "/admin", label: "Estadísticas", icon: LayoutDashboard },
  { href: "/admin/crm", label: "CRM (Leads)", icon: KanbanSquare },
  { href: "/admin/consultas", label: "Consultas y visitas", icon: MessageSquareText },
  { href: "/admin/reportes", label: "Reportes", icon: FileText },
  { href: "/admin/lotes", label: "Lotes y precios", icon: BarChart3, roles: ["administrador", "supervisor"] },
  { href: "/admin/contenido", label: "Contenido del sitio", icon: FileSliders, roles: ["administrador", "supervisor"] },
  { href: "/admin/galeria", label: "Galería", icon: ImageIcon, roles: ["administrador", "supervisor"] },
  { href: "/admin/banners", label: "Banners", icon: Images, roles: ["administrador", "supervisor"] },
  { href: "/admin/testimonios", label: "Testimonios", icon: Star, roles: ["administrador", "supervisor"] },
  { href: "/admin/faqs", label: "Preguntas frecuentes", icon: HelpCircle, roles: ["administrador", "supervisor"] },
  { href: "/admin/novedades", label: "Novedades", icon: Newspaper, roles: ["administrador", "supervisor"] },
  { href: "/admin/proyectos", label: "Proyectos", icon: Building2, roles: ["administrador", "supervisor"] },
  { href: "/admin/usuarios", label: "Usuarios y roles", icon: Users, roles: ["administrador"] },
  { href: "/admin/actividad", label: "Registro de actividad", icon: Activity, roles: ["administrador", "supervisor"] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const perfil = await getPerfilActual();
  const rol = perfil?.rol ?? "administrador";

  const navVisible = nav.filter((item) => !item.roles || item.roles.includes(rol));

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-black text-white lg:flex">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-display text-lg font-bold">Panel Inmobiliario</p>
          <p className="text-xs text-white/50">{perfil?.email ?? "Modo demo"}</p>
          {perfil && (
            <span className="mt-1 inline-block rounded-full bg-brand-gold-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-gold-400">
              {rol}
            </span>
          )}
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navVisible.map((item) => {
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
        <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3 lg:hidden">
          <MobileNavSelect items={navVisible.map(({ href, label }) => ({ href, label }))} />
          <form action={logoutAction}>
            <button type="submit" aria-label="Cerrar sesión" className="text-brand-black/60">
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>

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
