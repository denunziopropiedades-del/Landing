import { redirect } from "next/navigation";
import CobranzasManager from "@/components/admin/CobranzasManager";
import { getClientesCobranzasAdmin } from "@/lib/admin/data";
import { getPerfilActual } from "@/lib/admin/auth";

export default async function AdminCobranzasPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  const clientes = await getClientesCobranzasAdmin();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Cobranzas</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Informe financiero de los clientes financiados: seña abonada, plan elegido, y estado de cada cuota desde la
        primera hasta la última. Aparecen apenas pagan la seña, aunque todavía no se hayan generado las cuotas.
      </p>
      <div className="mt-8">
        <CobranzasManager clientes={clientes} />
      </div>
    </div>
  );
}
