import GaleriaManager from "@/components/admin/GaleriaManager";
import ProyectoSwitcher from "@/components/admin/ProyectoSwitcher";
import { getGaleriaAdmin, getProyectosAdmin } from "@/lib/admin/data";

export default async function AdminGaleriaPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: slugParam } = await searchParams;
  const proyectos = await getProyectosAdmin();
  const proyecto = proyectos.find((p) => p.slug === slugParam) ?? proyectos[0];

  if (!proyecto) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Galería</h1>
        <p className="mt-4 text-brand-black/60">Primero creá un proyecto en la sección Proyectos.</p>
      </div>
    );
  }

  const items = await getGaleriaAdmin(proyecto.id);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Galería</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Subí fotos, videos, tomas de drone, el plano del barrio y el masterplan.
      </p>

      <div className="mt-6">
        <ProyectoSwitcher proyectos={proyectos} actual={proyecto.slug} basePath="/admin/galeria" />
      </div>

      <div className="mt-8">
        <GaleriaManager proyectoId={proyecto.id} items={items} />
      </div>
    </div>
  );
}
