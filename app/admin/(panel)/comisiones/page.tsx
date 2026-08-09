import { redirect } from "next/navigation";
import CalculadoraComisiones from "@/components/admin/CalculadoraComisiones";
import { getPerfilActual } from "@/lib/admin/auth";

export default async function AdminComisionesPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Calculadora de comisiones</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Calculá la comisión de comprador y vendedor sobre el precio de venta, con distintos porcentajes.
      </p>
      <div className="mt-8">
        <CalculadoraComisiones />
      </div>
    </div>
  );
}
