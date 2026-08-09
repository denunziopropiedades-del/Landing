import LotesManager from "@/components/admin/LotesManager";
import ImportarLotesForm from "@/components/admin/ImportarLotesForm";
import PreciosPorMedidaForm from "@/components/admin/PreciosPorMedidaForm";
import ActualizarEstadosLotesForm from "@/components/admin/ActualizarEstadosLotesForm";
import CalibrarPlanoForm from "@/components/admin/CalibrarPlanoForm";
import ProgresoManager from "@/components/admin/ProgresoManager";
import ProyectoSwitcher from "@/components/admin/ProyectoSwitcher";
import { getLotesAdmin, getProgresoAdmin, getProyectosAdmin } from "@/lib/admin/data";
import { getGaleria } from "@/lib/content";

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

  const [lotes, progreso, galeria] = await Promise.all([
    getLotesAdmin(proyecto.id),
    getProgresoAdmin(proyecto.id),
    getGaleria(proyecto.id),
  ]);
  const masterplan = galeria.find((g) => g.categoria === "masterplan")?.url;

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
        <ImportarLotesForm proyectoId={proyecto.id} />
        <PreciosPorMedidaForm proyectoId={proyecto.id} lotes={lotes} />
        <ActualizarEstadosLotesForm proyectoId={proyecto.id} />
        <CalibrarPlanoForm
          proyectoId={proyecto.id}
          imagenMasterplan={masterplan}
          lotes={lotes}
          celdaAnchoPctInicial={proyecto.celdaAnchoPct ?? 1.7}
          celdaAltoPctInicial={proyecto.celdaAltoPct ?? 12.5}
        />
        <LotesManager proyectoId={proyecto.id} lotes={lotes} />
        <ProgresoManager proyectoId={proyecto.id} progreso={progreso} />
      </div>
    </div>
  );
}
