import DocumentosManager from "@/components/admin/DocumentosManager";
import { getDatosDocumentos } from "@/lib/admin/documentos-actions";

export const dynamic = "force-dynamic";

export default async function AdminDocumentosPage() {
  const { modelos, historial, clientes, avisoTablas } = await getDatosDocumentos();
  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Contratos y escritos</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Elegí un modelo, completá los datos (o traelos de un cliente del CRM) y descargá el PDF listo para firmar.
      </p>
      <div className="mt-6">
        <DocumentosManager modelos={modelos} historial={historial} clientes={clientes} avisoTablas={avisoTablas} />
      </div>
    </div>
  );
}
