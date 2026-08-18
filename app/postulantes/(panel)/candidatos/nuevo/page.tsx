import { crearCandidatoAction } from "@/lib/candidatos/actions";
import CandidatoForm from "@/components/candidatos/CandidatoForm";

export default function NuevoCandidatoPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-obra-slate-950">Cargar candidato</h1>
        <p className="text-sm text-slate-500">Alta manual (por ejemplo, un candidato que se acercó personalmente).</p>
      </div>
      <CandidatoForm action={crearCandidatoAction} submitLabel="Crear candidato" />
    </div>
  );
}
