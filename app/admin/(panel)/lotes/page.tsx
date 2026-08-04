import LotesManager from "@/components/admin/LotesManager";
import ProgresoManager from "@/components/admin/ProgresoManager";
import ProyectoSwitcher from "@/components/admin/ProyectoSwitcher";
import { getLotesAdmin, getProgresoAdmin, getProyectosAdmin } from "@/lib/admin/data";

export default async function AdminLotesPage({
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
        <h1 className="font-display text-2xl font-bold text-brand-black">Lotes y precios</h1>
        <p className="mt-4 text-brand-black/60">Primero creá un proyecto en la sección Proyectos.</p>
      </div>
    );
  }

  const [lotes, progreso] = await Promise.all([getLotesAdmin(proyecto.id), getProgresoAdmin(proyecto.id)]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Lotes y precios</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Administrá el inventario, precios, estado y posición en el mapa de cada lote.
      </p>

      <div className="mt-6">
        <ProyectoSwitcher proyectos={proyectos} actual={proyecto.slug} basePath="/admin/lotes" />
      </div>

      <div className="space-y-8">
        <LotesManager proyectoId={proyecto.id} lotes={lotes} />
        <ProgresoManager proyectoId={proyecto.id} progreso={progreso} />
      </div>
    </div>
  );
}
