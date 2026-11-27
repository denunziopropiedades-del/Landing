import { LogOut } from "lucide-react";
import AdminNav, { type IconoNav } from "@/components/admin/AdminNav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { logoutAction } from "@/lib/admin/actions";
import { getPerfilActual } from "@/lib/admin/auth";
import MobileNavSelect from "@/components/admin/MobileNavSelect";
import { contarNoLeidos } from "@/lib/admin/mensajes-actions";
import type { Rol } from "@/types/site";

type ItemNav = { href: string; label: string; icon: IconoNav; roles?: Rol[] };
const STAFF: Rol[] = ["administrador", "supervisor"];

/** Menú agrupado por tareas, en el orden en que se usan en el día a día. */
const secciones: { titulo: string; items: ItemNav[] }[] = [
  {
    titulo: "Ventas",
    items: [
      { href: "/admin", label: "Estadísticas", icon: "LayoutDashboard" },
      { href: "/admin/crm", label: "CRM (Leads)", icon: "KanbanSquare" },
      { href: "/admin/mensajes", label: "Mensajes", icon: "MessagesSquare" },
      { href: "/admin/plantillas", label: "Plantillas WhatsApp", icon: "LayoutTemplate", roles: STAFF },
      { href: "/admin/consultas", label: "Consultas y visitas", icon: "MessageSquareText" },
      { href: "/admin/coincidencias", label: "Coincidencias", icon: "Target" },
      { href: "/admin/reportes", label: "Reportes", icon: "FileText" },
    ],
  },
  {
    titulo: "Propiedades",
    items: [
      { href: "/admin/propiedades", label: "Propiedades y campos", icon: "House" },
      { href: "/admin/proyectos", label: "Desarrollos", icon: "Building2", roles: STAFF },
      { href: "/admin/lotes", label: "Lotes y precios", icon: "BarChart3", roles: STAFF },
      { href: "/admin/tasador", label: "Tasador y autorizaciones", icon: "Calculator", roles: STAFF },
    ],
  },
  {
    titulo: "Operaciones",
    items: [
      { href: "/admin/documentos-clientes", label: "Reservas y certificados", icon: "ShieldCheck", roles: STAFF },
      { href: "/admin/documentos", label: "Contratos y escritos", icon: "FileSignature" },
      { href: "/admin/cobranzas", label: "Cobranzas", icon: "Receipt", roles: STAFF },
      { href: "/admin/alquileres", label: "Administración de alquileres", icon: "KeyRound", roles: STAFF },
    ],
  },
  {
    titulo: "Finanzas",
    items: [
      { href: "/admin/facturacion", label: "Facturación", icon: "DollarSign", roles: STAFF },
      { href: "/admin/arca", label: "ARCA - Facturas", icon: "FileText", roles: STAFF },
      { href: "/admin/comisiones", label: "Calculadora de comisiones", icon: "Calculator", roles: STAFF },
    ],
  },
  {
    titulo: "Sitio web",
    items: [
      { href: "/admin/contenido", label: "Contenido del sitio", icon: "FileSliders", roles: STAFF },
      { href: "/admin/banners", label: "Banners", icon: "Images", roles: STAFF },
      { href: "/admin/galeria", label: "Galería", icon: "Image", roles: STAFF },
      { href: "/admin/novedades", label: "Novedades", icon: "Newspaper", roles: STAFF },
      { href: "/admin/testimonios", label: "Testimonios", icon: "Star", roles: STAFF },
      { href: "/admin/faqs", label: "Preguntas frecuentes", icon: "HelpCircle", roles: STAFF },
      { href: "/admin/newsletter", label: "Newsletter", icon: "Mail", roles: STAFF },
    ],
  },
  {
    titulo: "Equipo",
    items: [
      { href: "/admin/postulantes", label: "Postulantes (RR.HH.)", icon: "Briefcase", roles: STAFF },
      { href: "/admin/usuarios", label: "Usuarios y roles", icon: "Users", roles: ["administrador"] },
      { href: "/admin/actividad", label: "Registro de actividad", icon: "Activity", roles: STAFF },
    ],
  },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const perfil = await getPerfilActual();
  const rol = perfil?.rol ?? "administrador";

  const seccionesVisibles = secciones
    .map((sec) => ({ ...sec, items: sec.items.filter((item) => !item.roles || item.roles.includes(rol)) }))
    .filter((sec) => sec.items.length > 0);
  const noLeidos = perfil ? await contarNoLeidos().catch(() => 0) : 0;

  return (
    <div className="flex min-h-screen bg-brand-cream">
      <aside className="hidden w-64 shrink-0 flex-col bg-brand-black text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-display text-lg font-bold">Panel Inmobiliario</p>
          <p className="text-xs text-white/50">{perfil?.email ?? "Modo demo"}</p>
          {perfil && (
            <span className="mt-1 inline-block rounded-full bg-brand-gold-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-brand-gold-400">
              {rol}
            </span>
          )}
        </div>
        <AdminNav secciones={seccionesVisibles} badges={{ "/admin/mensajes": noLeidos }} />
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

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3 border-b border-black/5 bg-white px-4 py-3 lg:hidden">
          <MobileNavSelect grupos={seccionesVisibles.map((sec) => ({ titulo: sec.titulo, items: sec.items.map(({ href, label }) => ({ href, label })) }))} />
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
