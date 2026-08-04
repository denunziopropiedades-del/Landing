"use client";

import { useActionState } from "react";
import { Lock } from "lucide-react";
import { loginAction } from "@/lib/admin/actions";

const initialState = { ok: false as const, error: "" };

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen items-center justify-center bg-brand-black px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-gold-500/15">
            <Lock className="h-6 w-6 text-brand-gold-400" />
          </span>
          <h1 className="mt-4 font-display text-xl font-bold text-white">Panel Administrador</h1>
          <p className="mt-1 text-sm text-white/60">Matu Lotes</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-2.5 text-white focus:border-brand-gold-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/80">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              className="w-full rounded-lg border border-white/15 bg-brand-black px-4 py-2.5 text-white focus:border-brand-gold-400 focus:outline-none"
            />
          </div>

          {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-full bg-brand-gold-500 px-6 py-3 font-semibold text-brand-black transition hover:bg-brand-gold-400 disabled:opacity-60"
          >
            {pending ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/40">
          Configurá Supabase Auth (Email/Password) y creá el usuario admin desde el dashboard de Supabase.
        </p>
      </div>
    </main>
  );
}
