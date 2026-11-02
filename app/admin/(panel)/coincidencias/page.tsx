import CoincidenciasManager from "@/components/admin/CoincidenciasManager";
import { getDatosCoincidencias } from "@/lib/admin/coincidencias";

export const dynamic = "force-dynamic";

export default async function AdminCoincidenciasPage() {
  const { lotes, leads, faltaSql } = await getDatosCoincidencias();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Coincidencias</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Cruza lo que busca cada cliente (presupuesto, zona, forma de pago) con los lotes disponibles, para ofrecerle primero a quien le sirve.
      </p>
      {faltaSql && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta correr <b>sql-crm-mejoras.sql</b> en Supabase (SQL Editor) para usar esta sección.
        </p>
      )}
      <div className="mt-6">
        <CoincidenciasManager lotes={lotes} leads={leads} />
      </div>
    </div>
  );
}
