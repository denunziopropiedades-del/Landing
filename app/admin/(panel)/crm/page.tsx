import KanbanBoard from "@/components/admin/KanbanBoard";
import NuevoClienteForm from "@/components/admin/NuevoClienteForm";
import { getLeads, getPerfiles, getProyectosAdmin } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";

export default async function AdminCrmPage() {
  const [leads, perfiles, proyectos, actual] = await Promise.all([
    getLeads(),
    getPerfiles(),
    getProyectosAdmin(),
    getPerfilActual(),
  ]);
  const vendedores = perfiles.filter((p) => p.rol === "vendedor" && p.activo);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">CRM — Pipeline de leads</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Arrastrá cada tarjeta entre columnas para actualizar el estado del lead.
      </p>

      <div className="mt-8">
        <NuevoClienteForm proyectos={proyectos} vendedores={vendedores} rolActual={actual?.rol ?? "vendedor"} />
      </div>

      <div className="mt-8">
        <KanbanBoard leads={leads} vendedores={vendedores} proyectos={proyectos} rolActual={actual?.rol ?? "vendedor"} />
      </div>

      {leads.length === 0 && (
        <p className="mt-8 text-sm text-brand-black/50">
          No hay leads para mostrar. En modo demo (sin Supabase configurado) el CRM no tiene datos persistentes.
        </p>
      )}
    </div>
  );
}
