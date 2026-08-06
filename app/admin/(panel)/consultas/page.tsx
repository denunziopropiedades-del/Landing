import ConsultasManager from "@/components/admin/ConsultasManager";
import { getLeads, getProyectosAdmin, getVisitas } from "@/lib/admin/data";

export default async function AdminConsultasPage() {
  const [leads, visitas, proyectos] = await Promise.all([getLeads(), getVisitas(), getProyectosAdmin()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Consultas</h1>
      <p className="mt-1 text-sm text-brand-black/60">Gestioná leads de reservas, contacto y visitas agendadas.</p>
      <div className="mt-8">
        <ConsultasManager leads={leads} visitas={visitas} proyectos={proyectos} />
      </div>
    </div>
  );
}
