import Link from "next/link";
import { HardHat, LayoutDashboard, ListChecks, LogOut, Settings, UserPlus } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getAdminCandidatosActual } from "@/lib/candidatos/auth";
import { logoutCandidatosAction } from "@/lib/candidatos/actions";
import MobileNavSelect from "@/components/admin/MobileNavSelect";

const nav = [
  { href: "/postulantes", label: "Dashboard", icon: LayoutDashboard },
  { href: "/postulantes/candidatos", label: "Candidatos", icon: ListChecks },
  { href: "/postulantes/candidatos/nuevo", label: "Cargar candidato", icon: UserPlus },
  { href: "/postulantes/configuracion", label: "Configuración", icon: Settings },
];

export default async function PostulantesLayout({ children }: { children: React.ReactNode }) {
  const configured = isSupabaseConfigured();
  const admin = await getAdminCandidatosActual();

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="hidden w-64 shrink-0 flex-col bg-obra-slate-950 text-white lg:flex">
        <div className="flex items-center gap-2 border-b border-white/10 px-6 py-5">
          <HardHat className="h-5 w-5 text-obra-orange-400" />
          <div>
            <p className="text-lg font-bold leading-tight">Selección de personal</p>
            <p className="text-xs text-white/50">{admin?.email ?? "Modo demo"}</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
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
        <form action={logoutCandidatosAction} className="border-t border-white/10 p-3">
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
          <MobileNavSelect items={nav.map(({ href, label }) => ({ href, label }))} />
          <form action={logoutCandidatosAction}>
            <button type="submit" aria-label="Cerrar sesión" className="text-slate-500">
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
