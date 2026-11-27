import { redirect } from "next/navigation";
import PlantillasManager from "@/components/admin/PlantillasManager";
import { getPerfilActual } from "@/lib/admin/auth";
import { getCuentasWhatsapp } from "@/lib/admin/plantillas-actions";

export const dynamic = "force-dynamic";

export default async function AdminPlantillasPage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol === "vendedor") redirect("/admin/mensajes");
  const { cuentas, error } = await getCuentasWhatsapp();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Plantillas de WhatsApp</h1>
      <p className="mt-1 text-sm text-brand-black/60">
        Mensajes aprobados por Meta para iniciar conversaciones y hacer seguimientos después de las 24 h.
      </p>
      {error && <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">{error}</p>}
      {!error && cuentas.length === 0 && (
        <p className="mt-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">No encontré cuentas de WhatsApp con acceso para este token. Revisá que el usuario del sistema tenga asignada la cuenta de WhatsApp.</p>
      )}
      {cuentas.length > 0 && (
        <div className="mt-6">
          <PlantillasManager cuentas={cuentas} />
        </div>
      )}
    </div>
  );
}
