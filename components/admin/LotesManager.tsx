"use client";

import { Fragment, useActionState, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  actualizarEstadoLoteAction,
  actualizarPreciosMasivoAction,
  eliminarLoteAction,
  eliminarLotesAction,
  upsertLoteAction,
} from "@/lib/admin/actions";
import { formatUsd } from "@/lib/utils";
import type { EstadoLote, Lote } from "@/types/site";

const ESTADOS: EstadoLote[] = ["disponible", "reservado", "vendido", "no_disponible"];
const ESTADO_LABEL: Record<EstadoLote, string> = {
  disponible: "Disponible",
  reservado: "Reservado",
  vendido: "Vendido",
  no_disponible: "No disponible",
};
const ESTADO_COLOR: Record<EstadoLote, string> = {
  disponible: "bg-green-100 text-green-800",
  reservado: "bg-yellow-100 text-yellow-800",
  vendido: "bg-red-100 text-red-800",
  no_disponible: "bg-gray-200 text-gray-700",
};

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

function LoteForm({ proyectoId, lote, onDone }: { proyectoId: string; lote?: Lote; onDone?: () => void }) {
  const [state, formAction, pending] = useActionState(upsertLoteAction, null);

  return (
    <form
      action={(fd) => {
        formAction(fd);
        onDone?.();
      }}
      className="grid gap-3 sm:grid-cols-4"
    >
      <input type="hidden" name="proyectoId" value={proyectoId} />
      {lote && <input type="hidden" name="id" value={lote.id} />}
      <div>
        <label className={labelClass}>Nombre / tipología</label>
        <input name="nombre" defaultValue={lote?.nombre} placeholder="Lote 300 m²" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Manzana</label>
        <input name="manzana" defaultValue={lote?.manzana} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Número de lote</label>
        <input name="numero" defaultValue={lote?.numero} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Estado</label>
        <select name="estado" defaultValue={lote?.estado ?? "disponible"} className={inputClass}>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ESTADO_LABEL[e]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className={labelClass}>Superficie (m²)</label>
        <input name="superficieM2" type="number" defaultValue={lote?.superficieM2} required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Dimensiones</label>
        <input name="dimensiones" defaultValue={lote?.dimensiones} placeholder="10 x 30" required className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Precio USD (contado, precio final)</label>
        <input name="precioUsd" type="number" defaultValue={lote?.precioUsd} required className={inputClass} />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="destacado" defaultChecked={lote?.destacado} id={`destacado-${lote?.id ?? "new"}`} />
        <label htmlFor={`destacado-${lote?.id ?? "new"}`} className="text-sm text-brand-black/70">
          Destacar
        </label>
      </div>
      <div>
        <label className={labelClass}>Posición X en el mapa (0-100, opcional)</label>
        <input name="posX" type="number" min={0} max={100} defaultValue={lote?.posX ?? ""} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Posición Y en el mapa (0-100, opcional)</label>
        <input name="posY" type="number" min={0} max={100} defaultValue={lote?.posY ?? ""} className={inputClass} />
      </div>
      <div className="sm:col-span-4">
        <p className="mb-1 text-xs font-medium text-brand-black/70">
          Plan de financiación fijo (opcional). Si se completa, reemplaza a la calculadora por porcentaje para esta
          tipología.
        </p>
      </div>
      <div>
        <label className={labelClass}>Anticipo financiado (USD)</label>
        <input
          name="anticipoFinanciadoUsd"
          type="number"
          defaultValue={lote?.anticipoFinanciadoUsd ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Cantidad de cuotas</label>
        <input
          name="cuotasFinanciado"
          type="number"
          defaultValue={lote?.cuotasFinanciado ?? ""}
          className={inputClass}
        />
      </div>
      <div>
        <label className={labelClass}>Valor de cada cuota (USD)</label>
        <input
          name="valorCuotaFinanciadoUsd"
          type="number"
          defaultValue={lote?.valorCuotaFinanciadoUsd ?? ""}
          className={inputClass}
        />
      </div>
      <div className="flex items-end sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          {lote ? "Guardar cambios" : "Agregar lote"}
        </button>
        {state && !state.ok && <span className="ml-3 text-xs text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export default function LotesManager({ proyectoId, lotes }: { proyectoId: string; lotes: Lote[] }) {
  const [editando, setEditando] = useState<string | null>(null);
  const [creando, setCreando] = useState(false);
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [modoPrecio, setModoPrecio] = useState<"porcentaje" | "fijo">("porcentaje");
  const [valorPrecio, setValorPrecio] = useState("");
  const [pending, startTransition] = useTransition();

  const eliminar = (id: string) => {
    if (!confirm("¿Eliminar este lote?")) return;
    startTransition(() => {
      eliminarLoteAction(id);
    });
  };

  const cambiarEstado = (id: string, estado: EstadoLote) => {
    startTransition(() => {
      actualizarEstadoLoteAction(id, estado);
    });
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSeleccionarTodos = () => {
    setSeleccionados((prev) => (prev.length === lotes.length ? [] : lotes.map((l) => l.id)));
  };

  const eliminarSeleccionados = () => {
    if (!confirm(`¿Eliminar los ${seleccionados.length} lotes seleccionados? Esta acción no se puede deshacer.`)) return;
    startTransition(async () => {
      await eliminarLotesAction(seleccionados);
      setSeleccionados([]);
    });
  };

  const aplicarPrecioMasivo = () => {
    const valor = Number(valorPrecio);
    if (!valorPrecio || Number.isNaN(valor)) return;

    const mensaje =
      modoPrecio === "fijo"
        ? `¿Poner el precio de ${seleccionados.length} lotes en USD ${valor}?`
        : `¿Ajustar el precio de ${seleccionados.length} lotes en ${valor > 0 ? "+" : ""}${valor}%?`;
    if (!confirm(mensaje)) return;

    startTransition(async () => {
      await actualizarPreciosMasivoAction(seleccionados, modoPrecio, valor);
      setValorPrecio("");
    });
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-brand-black">Inventario de lotes</h2>
          <button type="button" onClick={() => setCreando((v) => !v)} className="text-sm font-semibold text-brand-green-700 hover:underline">
            {creando ? "Cancelar" : "+ Agregar lote"}
          </button>
        </div>
        {creando && <LoteForm proyectoId={proyectoId} onDone={() => setCreando(false)} />}
      </div>

      {seleccionados.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl border border-black/10 bg-brand-cream/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-brand-black">{seleccionados.length} lote(s) seleccionado(s)</p>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={modoPrecio}
              onChange={(e) => setModoPrecio(e.target.value as "porcentaje" | "fijo")}
              className="rounded-lg border border-black/10 px-2 py-2 text-sm"
            >
              <option value="porcentaje">Ajuste %</option>
              <option value="fijo">Precio fijo USD</option>
            </select>
            <input
              type="number"
              value={valorPrecio}
              onChange={(e) => setValorPrecio(e.target.value)}
              placeholder={modoPrecio === "fijo" ? "Ej: 2900" : "Ej: 10 o -5"}
              className="w-32 rounded-lg border border-black/10 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={pending || !valorPrecio}
              onClick={aplicarPrecioMasivo}
              className="rounded-full bg-brand-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
            >
              Aplicar precio
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={eliminarSeleccionados}
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionados
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={lotes.length > 0 && seleccionados.length === lotes.length}
                  onChange={toggleSeleccionarTodos}
                  aria-label="Seleccionar todos"
                />
              </th>
              <th className="px-4 py-3 font-medium">Manzana / Lote</th>
              <th className="px-4 py-3 font-medium">Tipología</th>
              <th className="px-4 py-3 font-medium">Superficie</th>
              <th className="px-4 py-3 font-medium">Precio</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lotes.map((lote) => (
              <Fragment key={lote.id}>
                <tr className="border-b border-black/5 last:border-0">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={seleccionados.includes(lote.id)}
                      onChange={() => toggleSeleccion(lote.id)}
                      aria-label={`Seleccionar lote ${lote.manzana}-${lote.numero}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {lote.manzana}-{lote.numero}
                  </td>
                  <td className="px-4 py-3">{lote.nombre}</td>
                  <td className="px-4 py-3">{lote.superficieM2} m²</td>
                  <td className="px-4 py-3">{formatUsd(lote.precioUsd)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={lote.estado}
                      disabled={pending}
                      onChange={(e) => cambiarEstado(lote.id, e.target.value as EstadoLote)}
                      className={`rounded-full border-0 px-2.5 py-1 text-xs font-semibold ${ESTADO_COLOR[lote.estado]}`}
                    >
                      {ESTADOS.map((e) => (
                        <option key={e} value={e}>
                          {ESTADO_LABEL[e]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => setEditando(editando === lote.id ? null : lote.id)} className="mr-3 text-brand-green-700 hover:underline">
                      <Pencil className="inline h-4 w-4" /> Editar
                    </button>
                    <button type="button" disabled={pending} onClick={() => eliminar(lote.id)} className="text-red-600 hover:underline disabled:opacity-50">
                      <Trash2 className="inline h-4 w-4" /> Eliminar
                    </button>
                  </td>
                </tr>
                {editando === lote.id && (
                  <tr className="border-b border-black/5 bg-brand-cream/60">
                    <td colSpan={7} className="px-4 py-4">
                      <LoteForm proyectoId={proyectoId} lote={lote} onDone={() => setEditando(null)} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {lotes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-brand-black/50">
                  Todavía no hay lotes cargados para este proyecto.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
