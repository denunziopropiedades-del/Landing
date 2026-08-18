import Link from "next/link";
import { Download } from "lucide-react";
import { getCandidatos, getConfiguracion } from "@/lib/candidatos/data";
import { CARGOS, CARGO_LABEL, DISPONIBILIDADES, DISPONIBILIDAD_LABEL, ESTADOS, ESTADO_LABEL } from "@/lib/candidatos/constants";
import type { Cargo, DisponibilidadInicio, EstadoCandidato, FiltrosCandidatos } from "@/types/candidatos";
import CandidatosGrid from "@/components/candidatos/CandidatosGrid";
import ImportarExcelForm from "@/components/candidatos/ImportarExcelForm";

const selectClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-obra-slate-950 focus:border-obra-orange-400 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-slate-500";

function str(v: string | string[] | undefined) {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function num(v: string | string[] | undefined) {
  const s = str(v);
  return s ? Number(s) : undefined;
}

export default async function CandidatosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  const filtros: FiltrosCandidatos = {
    busqueda: str(sp.busqueda),
    cargo: str(sp.cargo) as Cargo | undefined,
    localidad: str(sp.localidad),
    especialidad: str(sp.especialidad),
    experienciaMinima: num(sp.experienciaMin),
    pretensionMin: num(sp.pretensionMin),
    pretensionMax: num(sp.pretensionMax),
    disponibilidad: str(sp.disponibilidad) as DisponibilidadInicio | undefined,
    experienciaComprobable: sp.experienciaComprobable === "si" ? true : undefined,
    herramientasPropias: sp.herramientas === "si" ? true : undefined,
    movilidadPropia: sp.movilidad === "si" ? true : undefined,
    estado: str(sp.estado) as EstadoCandidato | undefined,
    orden: (str(sp.orden) as FiltrosCandidatos["orden"]) ?? "recientes",
  };

  const [candidatos, config] = await Promise.all([getCandidatos(filtros), getConfiguracion()]);

  const queryString = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v] as [string, string]] : []))
  ).toString();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-obra-slate-950">Candidatos</h1>
          <p className="text-sm text-slate-500">{candidatos.length} resultado(s) con los filtros aplicados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/postulantes/exportar${queryString ? `?${queryString}` : ""}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-obra-slate-950 transition hover:bg-slate-50"
          >
            <Download className="h-4 w-4" /> Exportar Excel
          </a>
          <ImportarExcelForm />
          <Link
            href="/postulantes/candidatos/nuevo"
            className="inline-flex items-center gap-2 rounded-full bg-obra-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-obra-orange-400"
          >
            + Cargar candidato
          </Link>
        </div>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <label className={labelClass}>Buscar (nombre, DNI, teléfono, localidad, especialidad)</label>
          <input name="busqueda" defaultValue={sp.busqueda as string} className={selectClass} />
        </div>
        <div>
          <label className={labelClass}>Cargo</label>
          <select name="cargo" defaultValue={(sp.cargo as string) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {CARGOS.map((c) => (
              <option key={c} value={c}>
                {CARGO_LABEL[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Estado</label>
          <select name="estado" defaultValue={(sp.estado as string) ?? ""} className={selectClass}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Localidad</label>
          <input name="localidad" defaultValue={sp.localidad as string} className={selectClass} />
        </div>
        <div>
          <label className={labelClass}>Especialidad</label>
          <input name="especialidad" defaultValue={sp.especialidad as string} className={selectClass} />
        </div>
        <div>
          <label className={labelClass}>Años de experiencia (mínimo)</label>
          <input type="number" name="experienciaMin" defaultValue={sp.experienciaMin as string} className={selectClass} />
        </div>
        <div>
          <label className={labelClass}>Disponibilidad</label>
          <select name="disponibilidad" defaultValue={(sp.disponibilidad as string) ?? ""} className={selectClass}>
            <option value="">Todas</option>
            {DISPONIBILIDADES.map((d) => (
              <option key={d} value={d}>
                {DISPONIBILIDAD_LABEL[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Pretensión diaria desde ($)</label>
          <input type="number" name="pretensionMin" defaultValue={sp.pretensionMin as string} className={selectClass} />
        </div>
        <div>
          <label className={labelClass}>Pretensión diaria hasta ($)</label>
          <input type="number" name="pretensionMax" defaultValue={sp.pretensionMax as string} className={selectClass} />
        </div>
        <div>
          <label className={labelClass}>Experiencia comprobable</label>
          <select name="experienciaComprobable" defaultValue={(sp.experienciaComprobable as string) ?? ""} className={selectClass}>
            <option value="">Indistinto</option>
            <option value="si">Sí</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Herramientas propias</label>
          <select name="herramientas" defaultValue={(sp.herramientas as string) ?? ""} className={selectClass}>
            <option value="">Indistinto</option>
            <option value="si">Sí</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Movilidad propia</label>
          <select name="movilidad" defaultValue={(sp.movilidad as string) ?? ""} className={selectClass}>
            <option value="">Indistinto</option>
            <option value="si">Sí</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Ordenar por</label>
          <select name="orden" defaultValue={(sp.orden as string) ?? "recientes"} className={selectClass}>
            <option value="recientes">Más recientes</option>
            <option value="puntaje">Mayor puntaje</option>
            <option value="experiencia">Mayor experiencia</option>
            <option value="pretension_asc">Pretensión: menor a mayor</option>
            <option value="pretension_desc">Pretensión: mayor a menor</option>
          </select>
        </div>
        <div className="flex items-end gap-2 lg:col-span-4">
          <button
            type="submit"
            className="rounded-full bg-obra-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-obra-slate-800"
          >
            Filtrar
          </button>
          <Link href="/postulantes/candidatos" className="rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-600">
            Limpiar filtros
          </Link>
        </div>
      </form>

      <CandidatosGrid candidatos={candidatos} mensajeWhatsappPlantilla={config.mensajeWhatsapp} />
    </div>
  );
}
