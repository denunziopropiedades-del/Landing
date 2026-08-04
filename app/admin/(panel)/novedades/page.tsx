import NovedadesManager from "@/components/admin/NovedadesManager";
import { getNovedadesAdmin } from "@/lib/admin/data";

export default async function AdminNovedadesPage() {
  const novedades = await getNovedadesAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Novedades</h1>
      <p className="mt-1 text-sm text-brand-black/60">Publicá noticias y anuncios sobre el desarrollo.</p>
      <div className="mt-8">
        <NovedadesManager novedades={novedades} />
      </div>
    </div>
  );
}
