import { getConfiguracion } from "@/lib/candidatos/data";
import ConfiguracionForm from "@/components/candidatos/ConfiguracionForm";

export default async function ConfiguracionPage() {
  const config = await getConfiguracion();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obra-slate-950">Configuración</h1>
        <p className="text-sm text-slate-500">Ajustá el puntaje automático y el mensaje de WhatsApp.</p>
      </div>
      <ConfiguracionForm config={config} />
    </div>
  );
}
