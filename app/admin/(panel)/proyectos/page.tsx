import ProyectosManager from "@/components/admin/ProyectosManager";
import { getProyectos } from "@/lib/admin/data";

export default async function AdminProyectosPage() {
  const proyectos = await getProyectos();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Proyectos</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Administrá múltiples desarrollos inmobiliarios además de Ayres de Guernica.
      </p>
      <div className="mt-8">
        <ProyectosManager proyectos={proyectos} />
      </div>
    </div>
  );
}
