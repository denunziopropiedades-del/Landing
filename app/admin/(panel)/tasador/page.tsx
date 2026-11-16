import { redirect } from "next/navigation";
import TasadorManager from "@/components/admin/TasadorManager";
import { getPerfilActual } from "@/lib/admin/auth";
import { getDatosTasador } from "@/lib/admin/tasador-actions";

export const dynamic = "force-dynamic";

export default async function AdminTasadorPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");

  const datos = await getDatosTasador();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Tasador y autorizaciones de venta</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Pedidos que llegan desde el{" "}
        <a href="/tasador" target="_blank" className="font-semibold text-brand-green-700 underline">
          tasador online
        </a>
        : revisá el valor, armá el informe comparativo y emití la autorización de venta para firmar online.
      </p>
      {datos.faltaTabla && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta correr <b>sql-tasador.sql</b> en Supabase (SQL Editor) para guardar los pedidos del tasador.
        </p>
      )}
      <div className="mt-8">
        <TasadorManager datos={datos} puedeEliminar={!actual || actual.rol === "administrador"} />
      </div>
    </div>
  );
}
