import { redirect } from "next/navigation";
import CobranzasManager from "@/components/admin/CobranzasManager";
import { getCuotasAdmin } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";

export default async function AdminCobranzasPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  const cuotas = await getCuotasAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Cobranzas</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Cuotario de los clientes que reservaron financiado: totales, mora y estado de cada cuota, desde la primera
        hasta la última.
      </p>
      <div className="mt-8">
        <CobranzasManager cuotas={cuotas} />
      </div>
    </div>
  );
}
