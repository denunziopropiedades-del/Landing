import { redirect } from "next/navigation";
import FacturacionManager from "@/components/admin/FacturacionManager";
import { getGastosAdmin, getLeads, getProyectosAdmin } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";

export default async function AdminFacturacionPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  const [leads, gastos, proyectos] = await Promise.all([getLeads(), getGastosAdmin(), getProyectosAdmin()]);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Facturación</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Ingresos, comisiones, honorarios y gastos del negocio, con reporte mensual para armar las facturas
        correspondientes.
      </p>
      <div className="mt-8">
        <FacturacionManager leads={leads} gastos={gastos} proyectos={proyectos} />
      </div>
    </div>
  );
}
