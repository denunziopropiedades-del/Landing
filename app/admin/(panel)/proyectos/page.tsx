import ProyectosManager from "@/components/admin/ProyectosManager";
import { getProyectosAdmin } from "@/lib/admin/data";

export default async function AdminProyectosPage() {
  const proyectos = await getProyectosAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Proyectos</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Creá, editá, publicá y administrá los desarrollos inmobiliarios de la plataforma.
      </p>
      <div className="mt-8">
        <ProyectosManager proyectos={proyectos} />
      </div>
    </div>
  );
}
