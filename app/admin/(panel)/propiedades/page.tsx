import PropiedadesManager from "@/components/admin/PropiedadesManager";
import { getPropiedadesAdmin } from "@/lib/admin/propiedades-actions";

export default async function AdminPropiedadesPage() {
  const { propiedades, error } = await getPropiedadesAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Propiedades</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Casas, departamentos, locales, terrenos y campos en venta o alquiler. Se muestran en Comprar, Alquilar, Campos y Zonas.
      </p>
      <div className="mt-8">
        <PropiedadesManager propiedades={propiedades} error={error} />
      </div>
    </div>
  );
}
