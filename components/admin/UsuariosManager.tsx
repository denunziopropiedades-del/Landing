"use client";

import { useActionState, useTransition } from "react";
import { UserPlus } from "lucide-react";
import {
  actualizarNombreUsuarioAction,
  cambiarRolUsuarioAction,
  invitarUsuarioAction,
  toggleActivoUsuarioAction,
} from "@/lib/admin/actions";
import type { Perfil, Rol } from "@/types/site";

const ROLES: Rol[] = ["administrador", "supervisor", "vendedor"];

const inputClass =
  "w-full rounded-lg border border-black/10 px-3 py-2 text-sm focus:border-brand-green-600 focus:outline-none";
const labelClass = "mb-1 block text-xs font-medium text-brand-black/70";

export default function UsuariosManager({ perfiles, usuarioActualId }: { perfiles: Perfil[]; usuarioActualId: string }) {
  const [state, formAction, pending] = useActionState(invitarUsuarioAction, null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-display text-lg font-bold text-brand-black">Invitar usuario</h2>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px] flex-1">
            <label className={labelClass}>Email</label>
            <input type="email" name="email" required className={inputClass} />
          </div>
          <div className="min-w-[160px] flex-1">
            <label className={labelClass}>Nombre</label>
            <input name="nombre" required className={inputClass} />
          </div>
          <div className="w-40">
            <label className={labelClass}>Rol</label>
            <select name="rol" defaultValue="vendedor" className={inputClass}>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-brand-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-green-600 disabled:opacity-60"
          >
            <UserPlus className="h-4 w-4" />
            Invitar
          </button>
        </form>
        {state && !state.ok && <p className="mt-2 text-xs text-red-600">{state.error}</p>}
        <p className="mt-3 text-xs text-brand-black/50">
          Se envía un email de invitación con un link para que la persona defina su contraseña.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-black/5 bg-white shadow-sm">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead className="border-b border-black/10 text-brand-black/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {perfiles.map((p) => (
              <tr key={p.id} className="border-b border-black/5 last:border-0">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-1.5">
                    <input
                      key={p.id}
                      defaultValue={p.nombre ?? ""}
                      placeholder="Sin nombre"
                      onBlur={(e) => {
                        if (e.target.value === (p.nombre ?? "")) return;
                        startTransition(() => {
                          actualizarNombreUsuarioAction(p.id, e.target.value);
                        });
                      }}
                      className="w-32 rounded-lg border border-transparent px-1.5 py-1 hover:border-black/10 focus:border-brand-green-600 focus:outline-none"
                    />
                    {p.id === usuarioActualId && <span className="shrink-0 text-xs text-brand-black/40">(vos)</span>}
                  </div>
                </td>
                <td className="px-4 py-3">{p.email}</td>
                <td className="px-4 py-3">
                  <select
                    defaultValue={p.rol}
                    disabled={p.id === usuarioActualId}
                    onChange={(e) =>
                      startTransition(() => {
                        cambiarRolUsuarioAction(p.id, e.target.value as Rol);
                      })
                    }
                    className="rounded-lg border border-black/10 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">{p.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={p.id === usuarioActualId}
                    onClick={() =>
                      startTransition(() => {
                        toggleActivoUsuarioAction(p.id, !p.activo);
                      })
                    }
                    className="text-brand-green-700 hover:underline disabled:opacity-40"
                  >
                    {p.activo ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
