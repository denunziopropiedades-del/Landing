import BannersManager from "@/components/admin/BannersManager";
import { getBannersAdmin, getProyectosAdmin } from "@/lib/admin/data";

export default async function AdminBannersPage() {
  const [banners, proyectos] = await Promise.all([getBannersAdmin(), getProyectosAdmin()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Banners</h1>
      <p className="mt-1 text-sm text-brand-black/60">Administrá los banners promocionales del sitio.</p>
      <div className="mt-8">
        <BannersManager proyectos={proyectos} banners={banners} />
      </div>
    </div>
  );
}
