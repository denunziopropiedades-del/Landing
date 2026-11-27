import { redirect } from "next/navigation";
import AsistenteConfig from "@/components/admin/AsistenteConfig";
import { getPerfilActual } from "@/lib/admin/auth";
import { getAsistenteDatos } from "@/lib/admin/asistente-actions";

export const dynamic = "force-dynamic";

export default async function AdminAsistentePage() {
  const actual = await getPerfilActual();
  if (actual && actual.rol !== "administrador") redirect("/admin/mensajes");
  const { config, canales, logs, tokensMes, faltaTabla } = await getAsistenteDatos();

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-brand-black">Asistente de IA</h1>
      <p className="mt-1 mb-5 text-sm text-brand-black/60">
        Atiende WhatsApp con los datos reales de tus desarrollos y propiedades: asesora, agenda visitas, avanza reservas y hace seguimientos.
      </p>
      {faltaTabla && (
        <p className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-900">Falta correr sql-asistente.sql en Supabase.</p>
      )}
      <AsistenteConfig inicial={config} canales={canales} logs={logs} tokensMes={tokensMes} />
    </div>
  );
}
