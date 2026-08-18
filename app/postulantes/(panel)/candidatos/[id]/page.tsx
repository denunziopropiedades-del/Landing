import { notFound } from "next/navigation";
import Link from "next/link";
import { getCandidato, getConfiguracion } from "@/lib/candidatos/data";
import { actualizarCandidatoAction } from "@/lib/candidatos/actions";
import CandidatoForm from "@/components/candidatos/CandidatoForm";
import FichaCandidato from "@/components/candidatos/FichaCandidato";

export default async function CandidatoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [candidato, config] = await Promise.all([getCandidato(id), getConfiguracion()]);

  if (!candidato) notFound();

  if (sp.editar) {
    const updateAction = actualizarCandidatoAction.bind(null, candidato.id);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-obra-slate-950">Editar candidato</h1>
            <p className="text-sm text-slate-500">{candidato.nombreApellido}</p>
          </div>
          <Link href={`/postulantes/candidatos/${candidato.id}`} className="text-sm font-semibold text-slate-500 hover:text-obra-slate-950">
            Cancelar
          </Link>
        </div>
        <CandidatoForm action={updateAction} candidato={candidato} submitLabel="Guardar cambios" />
      </div>
    );
  }

  return <FichaCandidato candidato={candidato} mensajeWhatsappPlantilla={config.mensajeWhatsapp} />;
}
