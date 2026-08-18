"use client";

import { useActionState } from "react";
import { HardHat, Lock } from "lucide-react";
import { loginCandidatosAction } from "@/lib/candidatos/actions";

const initialState = { ok: false as const, error: "" };

export default function PostulantesLoginPage() {
  const [state, formAction, pending] = useActionState(loginCandidatosAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-obra-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-obra-slate-700 bg-obra-slate-900/60 p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-obra-orange-500/15">
            <HardHat className="h-6 w-6 text-obra-orange-400" />
          </span>
          <h1 className="mt-4 text-xl font-bold text-white">Selección de personal</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/50">
            <Lock className="h-3.5 w-3.5" /> Panel administrador
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-obra-slate-700 bg-obra-slate-950 px-4 py-2.5 text-white focus:border-obra-orange-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg border border-obra-slate-700 bg-obra-slate-950 px-4 py-2.5 text-white focus:border-obra-orange-400 focus:outline-none"
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-obra-orange-500 px-6 py-3 font-semibold text-white transition hover:bg-obra-orange-400 disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Configurá Supabase Auth y habilitá tu usuario en la tabla candidatos_administradores (ver README).
        </p>
      </div>
    </main>
  );
}
