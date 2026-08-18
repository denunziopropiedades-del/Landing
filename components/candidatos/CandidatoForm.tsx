"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { CARGOS, CARGO_LABEL, DISPONIBILIDADES, DISPONIBILIDAD_LABEL, ESTADOS, ESTADO_LABEL } from "@/lib/candidatos/constants";
import type { Candidato } from "@/types/candidatos";

type ActionResult = { ok: true } | { ok: false; error: string };
type ActionFn = (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-obra-slate-950 focus:border-obra-orange-400 focus:outline-none";
const label = "mb-1.5 block text-sm font-medium text-slate-600";
const section = "space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm";
const sectionTitle = "text-sm font-semibold uppercase tracking-wide text-obra-orange-600";
const checkboxRow = "flex items-center gap-2 text-sm text-slate-700";

export default function CandidatoForm({
  action,
  candidato,
  submitLabel = "Guardar",
}: {
  action: ActionFn;
  candidato?: Candidato;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <div className={section}>
        <p className={sectionTitle}>Datos personales</p>
        <div>
          <label className={label}>Nombre y apellido</label>
          <input name="nombreApellido" required defaultValue={candidato?.nombreApellido} className={input} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>DNI</label>
            <input name="dni" required inputMode="numeric" defaultValue={candidato?.dni} className={input} />
          </div>
          <div>
            <label className={label}>Edad</label>
            <input type="number" name="edad" required defaultValue={candidato?.edad ?? undefined} className={input} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Teléfono / WhatsApp</label>
            <input name="telefono" required inputMode="tel" defaultValue={candidato?.telefono} className={input} />
          </div>
          <div>
            <label className={label}>Localidad</label>
            <input name="localidad" required defaultValue={candidato?.localidad ?? undefined} className={input} />
          </div>
        </div>
      </div>

      <div className={section}>
        <p className={sectionTitle}>Perfil laboral</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Cargo</label>
            <select name="cargo" defaultValue={candidato?.cargo ?? "ayudante"} className={input}>
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {CARGO_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Años de experiencia</label>
            <input
              type="number"
              step="0.5"
              name="anosExperiencia"
              defaultValue={candidato?.anosExperiencia ?? 0}
              className={input}
            />
          </div>
        </div>
        <div>
          <label className={label}>Especialidad</label>
          <input name="especialidad" defaultValue={candidato?.especialidad ?? undefined} className={input} />
        </div>
        <div>
          <label className={label}>Trabajos que sabe realizar</label>
          <textarea rows={3} name="trabajosQueSabe" defaultValue={candidato?.trabajosQueSabe ?? undefined} className={input} />
        </div>
        <div>
          <label className={label}>Referencias laborales</label>
          <textarea rows={2} name="referenciasLaborales" defaultValue={candidato?.referenciasLaborales ?? undefined} className={input} />
        </div>
        <label className={checkboxRow}>
          <input
            type="checkbox"
            name="experienciaComprobable"
            defaultChecked={candidato?.experienciaComprobable}
            className="h-4 w-4 accent-obra-orange-500"
          />
          Experiencia comprobable
        </label>
      </div>

      <div className={section}>
        <p className={sectionTitle}>Disponibilidad y remuneración</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Disponibilidad para comenzar</label>
            <select name="disponibilidadInicio" defaultValue={candidato?.disponibilidadInicio ?? ""} className={input}>
              <option value="">Sin especificar</option>
              {DISPONIBILIDADES.map((d) => (
                <option key={d} value={d}>
                  {DISPONIBILIDAD_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Disponibilidad horaria</label>
            <input name="disponibilidadHoraria" defaultValue={candidato?.disponibilidadHoraria ?? undefined} className={input} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={label}>Pretensión salarial diaria ($ ARS)</label>
            <input
              type="number"
              name="pretensionSalarialDiaria"
              defaultValue={candidato?.pretensionSalarialDiaria ?? undefined}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Última remuneración diaria cobrada ($ ARS)</label>
            <input
              type="number"
              name="ultimaRemuneracionDiaria"
              defaultValue={candidato?.ultimaRemuneracionDiaria ?? undefined}
              className={input}
            />
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className={checkboxRow}>
            <input type="checkbox" name="aceptaJornada" defaultChecked={candidato?.aceptaJornada} className="h-4 w-4 accent-obra-orange-500" />
            Acepta trabajo por jornada
          </label>
          <label className={checkboxRow}>
            <input type="checkbox" name="aceptaObra" defaultChecked={candidato?.aceptaObra} className="h-4 w-4 accent-obra-orange-500" />
            Acepta trabajo por obra
          </label>
          <label className={checkboxRow}>
            <input type="checkbox" name="herramientasPropias" defaultChecked={candidato?.herramientasPropias} className="h-4 w-4 accent-obra-orange-500" />
            Herramientas propias
          </label>
          <label className={checkboxRow}>
            <input type="checkbox" name="movilidadPropia" defaultChecked={candidato?.movilidadPropia} className="h-4 w-4 accent-obra-orange-500" />
            Movilidad propia
          </label>
        </div>
      </div>

      <div className={section}>
        <p className={sectionTitle}>Estado y observaciones</p>
        <div>
          <label className={label}>Estado del candidato</label>
          <select name="estado" defaultValue={candidato?.estado ?? "pendiente"} className={input}>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>
                {ESTADO_LABEL[e]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>Observaciones</label>
          <textarea rows={3} name="observaciones" defaultValue={candidato?.observaciones ?? undefined} className={input} />
        </div>
      </div>

      {state && !state.ok && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-obra-orange-500 px-8 py-3 font-semibold text-white transition hover:bg-obra-orange-400 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
