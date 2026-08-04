import ContenidoManager from "@/components/admin/ContenidoManager";
import PromocionesManager from "@/components/admin/PromocionesManager";
import ProyectoSwitcher from "@/components/admin/ProyectoSwitcher";
import { getFinanciacionAdmin, getPromocionesAdmin, getProyectosAdmin } from "@/lib/admin/data";
import { getSiteTextos } from "@/lib/content";

export default async function AdminContenidoPage({
  searchParams,
}: {
  searchParams: Promise<{ proyecto?: string }>;
}) {
  const { proyecto: slugParam } = await searchParams;
  const proyectos = await getProyectosAdmin();
  const proyecto = proyectos.find((p) => p.slug === slugParam) ?? proyectos[0];
  const textos = await getSiteTextos();

  if (!proyecto) {
    return (
      <div>
        <h1 className="font-display text-2xl font-bold text-brand-black">Contenido</h1>
        <p className="mt-4 text-brand-black/60">Primero creá un proyecto en la sección Proyectos.</p>
      </div>
    );
  }

  const [promociones, financiacion] = await Promise.all([
    getPromocionesAdmin(proyecto.id),
    getFinanciacionAdmin(proyecto.id),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Contenido</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Editá la promoción y financiación de cada proyecto, y los textos generales de la plataforma.
      </p>

      <div className="mt-6">
        <ProyectoSwitcher proyectos={proyectos} actual={proyecto.slug} basePath="/admin/contenido" />
      </div>

      <div className="space-y-8">
        <PromocionesManager proyectoId={proyecto.id} promociones={promociones} />
        <ContenidoManager proyectoId={proyecto.id} financiacion={financiacion} textos={textos} />
      </div>
    </div>
  );
}
