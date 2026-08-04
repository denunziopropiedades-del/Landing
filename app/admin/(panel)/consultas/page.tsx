import ConsultasManager from "@/components/admin/ConsultasManager";
import { getLeads, getVisitas } from "@/lib/admin/data";

export default async function AdminConsultasPage() {
  const [leads, visitas] = await Promise.all([getLeads(), getVisitas()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Consultas</h1>
      <p className="mt-1 text-sm text-brand-black/60">Gestioná leads de reservas, contacto y visitas agendadas.</p>
      <div className="mt-8">
        <ConsultasManager leads={leads} visitas={visitas} />
      </div>
    </div>
  );
}
