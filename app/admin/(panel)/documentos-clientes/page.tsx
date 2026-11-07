import { redirect } from "next/navigation";
import { getPerfilActual } from "@/lib/admin/auth";
import { condicionesReservaBase, getDatosDocsClientes } from "@/lib/admin/docs-clientes-actions";
import DocumentosClientesManager from "@/components/admin/DocumentosClientesManager";

export const dynamic = "force-dynamic";

export default async function AdminDocumentosClientesPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin");
  const [datos, condiciones] = await Promise.all([getDatosDocsClientes(), condicionesReservaBase()]);
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Reservas y certificados</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Emití reservas y certificados de libre deuda con número, PDF y QR de verificación; mandalos por mail o WhatsApp con un enlace privado donde el
        cliente los ve, los descarga y acepta o rechaza la reserva.
      </p>
      {datos.faltaSql && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">
          Falta crear las tablas: corré <b>sql-documentos-clientes.sql</b> en Supabase (SQL Editor) y recargá esta página.
        </p>
      )}
      <div className="mt-6">
        <DocumentosClientesManager datos={datos} condicionesBase={condiciones} />
      </div>
    </div>
  );
}
